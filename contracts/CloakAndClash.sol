// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    FHE,
    ebool,
    euint8,
    euint32,
    externalEuint8
} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CloakAndClash - Privacy-preserving Rock Paper Scissors
/// @notice Enables two players to compete using homomorphically encrypted moves.
/// @dev This contract implements a fully homomorphic encryption based game where
/// players can submit encrypted moves and the contract resolves outcomes without
/// revealing the actual moves until the game concludes.
contract CloakAndClash is SepoliaConfig {
    uint256 public constant ROUND_DURATION = 3 minutes;

    uint8 private constant RESULT_TIE = 0;
    uint8 private constant RESULT_A_WINS = 1;
    uint8 private constant RESULT_B_WINS = 2;

    enum MatchStatus {
        WaitingForOpponent,
        WaitingForResolution,
        Resolved,
        Cancelled
    }

    struct EncryptedMove {
        euint8 value;
        bool submitted;
        uint256 submittedAt;
    }

    struct Match {
        address playerA;
        address playerB;
        uint256 createdAt;
        uint256 deadline;
        MatchStatus status;
        EncryptedMove moveA;
        EncryptedMove moveB;
        euint8 encryptedOutcome;
        ebool aWins;
        ebool bWins;
        ebool isTie;
        bool outcomeComputed;
        uint256 decryptionRequestId;
        bool decryptionRequested;
    }

    /**
     * @dev Encrypted player statistics structure
     * All statistics are stored as encrypted integers to maintain privacy
     */
    struct PlayerStats {
        euint32 wins;
        euint32 losses;
        euint32 ties;
        bool initialized;
    }

    struct MatchView {
        address playerA;
        address playerB;
        uint256 createdAt;
        uint256 deadline;
        MatchStatus status;
        bool moveASubmitted;
        bool moveBSubmitted;
        euint8 moveA;
        euint8 moveB;
        bool outcomeReady;
        euint8 outcome;
        ebool aWins;
        ebool bWins;
        ebool isTie;
    }

    uint256 public nextMatchId;

    mapping(uint256 => Match) private _matches;
    mapping(uint256 => uint256) private _requestToMatch;
    mapping(address => PlayerStats) private _stats;

    event MatchCreated(uint256 indexed matchId, address indexed playerA, address indexed playerB, uint256 deadline);
    event MoveSubmitted(uint256 indexed matchId, address indexed player, bool isSecondMove);
    event MatchResolved(
        uint256 indexed matchId,
        euint8 encryptedOutcome,
        ebool aWins,
        ebool bWins,
        ebool isTie
    );
    event ForfeitProcessed(uint256 indexed matchId, address indexed forfeitingPlayer);
    event DecryptionRequested(uint256 indexed matchId, uint256 requestId);
    event MatchDecrypted(uint256 indexed matchId, uint8 moveA, uint8 moveB, uint8 outcome);
    event PlayerStatsUpdated(address indexed player, euint32 wins, euint32 losses, euint32 ties);

    modifier matchExists(uint256 matchId) {
        require(matchId < nextMatchId, "CloakAndClash: match does not exist");
        _;
    }

    /// @notice Creates a match against a specific opponent with the caller's encrypted move.
    function createMatch(
        address opponent,
        externalEuint8 encryptedMove,
        bytes calldata inputProof
    ) external returns (uint256 matchId) {
        require(opponent != address(0), "CloakAndClash: invalid opponent");
        require(opponent != msg.sender, "CloakAndClash: opponent cannot be self");

        matchId = nextMatchId++;

        Match storage m = _matches[matchId];
        m.playerA = msg.sender;
        m.playerB = opponent;
        m.createdAt = block.timestamp;
        m.deadline = block.timestamp + ROUND_DURATION;
        m.status = MatchStatus.WaitingForOpponent;

        euint8 move = FHE.fromExternal(encryptedMove, inputProof);
        m.moveA = EncryptedMove({value: move, submitted: true, submittedAt: block.timestamp});

        _allowMoveForParticipants(move, msg.sender, opponent);

        emit MatchCreated(matchId, msg.sender, opponent, m.deadline);
        emit MoveSubmitted(matchId, msg.sender, false);
    }

    /// @notice Allows the opponent to submit their encrypted move.
    function submitMove(
        uint256 matchId,
        externalEuint8 encryptedMove,
        bytes calldata inputProof
    ) external matchExists(matchId) {
        Match storage m = _matches[matchId];
        require(m.status == MatchStatus.WaitingForOpponent, "CloakAndClash: match not accepting moves");
        require(msg.sender == m.playerB, "CloakAndClash: only designated opponent");
        require(block.timestamp <= m.deadline, "CloakAndClash: submission window closed");
        require(!m.moveB.submitted, "CloakAndClash: move already submitted");

        euint8 move = FHE.fromExternal(encryptedMove, inputProof);
        m.moveB = EncryptedMove({value: move, submitted: true, submittedAt: block.timestamp});
        m.status = MatchStatus.WaitingForResolution;

        _allowMoveForParticipants(move, m.playerA, m.playerB);

        emit MoveSubmitted(matchId, msg.sender, true);
    }

    /// @notice Resolves a match by computing the encrypted outcome. Handles forfeits automatically.
    function resolveMatch(uint256 matchId) external matchExists(matchId) {
        Match storage m = _matches[matchId];
        require(
            m.status == MatchStatus.WaitingForResolution || m.status == MatchStatus.WaitingForOpponent,
            "CloakAndClash: nothing to resolve"
        );
        require(!m.outcomeComputed, "CloakAndClash: outcome already computed");

        if (!m.moveB.submitted) {
            require(block.timestamp > m.deadline, "CloakAndClash: opponent still has time");

            euint8 placeholder = FHE.asEuint8(255);
            m.moveB = EncryptedMove({value: placeholder, submitted: false, submittedAt: 0});
            _allowMoveForParticipants(placeholder, m.playerA, m.playerB);

            ebool forfeitAWins = FHE.asEbool(true);
            ebool forfeitBWins = FHE.asEbool(false);
            ebool forfeitTie = FHE.asEbool(false);
            euint8 forfeitOutcome = FHE.asEuint8(RESULT_A_WINS);

            _finalizeOutcome(matchId, m, forfeitOutcome, forfeitAWins, forfeitBWins, forfeitTie);

            emit ForfeitProcessed(matchId, m.playerB);
            return;
        }

        (euint8 outcome, ebool isTie, ebool aWins, ebool bWins) = _computeOutcome(m.moveA.value, m.moveB.value);

        _finalizeOutcome(matchId, m, outcome, aWins, bWins, isTie);
    }

    /// @notice Requests decryption of both moves and the outcome via the FHE oracle.
    function requestMatchDecryption(uint256 matchId) external matchExists(matchId) returns (uint256 requestId) {
        Match storage m = _matches[matchId];
        require(m.outcomeComputed, "CloakAndClash: outcome not ready");
        require(!m.decryptionRequested, "CloakAndClash: decryption already requested");

        bytes32[] memory handles = new bytes32[](3);
        handles[0] = FHE.toBytes32(m.moveA.value);
        handles[1] = FHE.toBytes32(m.moveB.value);
        handles[2] = FHE.toBytes32(m.encryptedOutcome);

        requestId = FHE.requestDecryption(handles, this.onDecryptionComplete.selector);
        m.decryptionRequestId = requestId;
        m.decryptionRequested = true;
        _requestToMatch[requestId] = matchId;

        emit DecryptionRequested(matchId, requestId);
    }

    /// @notice Callback executed when decrypted plaintexts are ready.
    function onDecryptionComplete(
        uint256 requestId,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external returns (bool) {
        uint256 matchId = _requestToMatch[requestId];
        Match storage m = _matches[matchId];
        require(m.decryptionRequested, "CloakAndClash: invalid request");

        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        (uint8 moveA, uint8 moveB, uint8 outcome) = abi.decode(cleartexts, (uint8, uint8, uint8));
        emit MatchDecrypted(matchId, moveA, moveB, outcome);
        return true;
    }

    /// @notice Retrieves a view of the match, including encrypted state.
    function getMatch(uint256 matchId) external view matchExists(matchId) returns (MatchView memory) {
        Match storage m = _matches[matchId];
        return
            MatchView({
                playerA: m.playerA,
                playerB: m.playerB,
                createdAt: m.createdAt,
                deadline: m.deadline,
                status: m.status,
                moveASubmitted: m.moveA.submitted,
                moveBSubmitted: m.moveB.submitted,
                moveA: m.moveA.value,
                moveB: m.moveB.value,
                outcomeReady: m.outcomeComputed,
                outcome: m.encryptedOutcome,
                aWins: m.aWins,
                bWins: m.bWins,
                isTie: m.isTie
            });
    }

    /// @notice Returns encrypted aggregate statistics for a player.
    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        return _stats[player];
    }

    function _computeOutcome(
        euint8 moveA,
        euint8 moveB
    ) private returns (euint8 outcome, ebool isTie, ebool aWins, ebool bWins) {
        isTie = FHE.eq(moveA, moveB);

        ebool aBeatsB = FHE.or(
            FHE.or(
                FHE.and(FHE.eq(moveA, 0), FHE.eq(moveB, 2)),
                FHE.and(FHE.eq(moveA, 1), FHE.eq(moveB, 0))
            ),
            FHE.and(FHE.eq(moveA, 2), FHE.eq(moveB, 1))
        );

        aWins = FHE.select(isTie, FHE.asEbool(false), aBeatsB);
        bWins = FHE.select(
            isTie,
            FHE.asEbool(false),
            FHE.select(aBeatsB, FHE.asEbool(false), FHE.asEbool(true))
        );

        outcome = FHE.select(
            isTie,
            FHE.asEuint8(RESULT_TIE),
            FHE.select(aWins, FHE.asEuint8(RESULT_A_WINS), FHE.asEuint8(RESULT_B_WINS))
        );
    }

    function _finalizeOutcome(
        uint256 matchId,
        Match storage m,
        euint8 outcome,
        ebool aWins,
        ebool bWins,
        ebool isTie
    ) private {
        m.encryptedOutcome = outcome;
        m.aWins = aWins;
        m.bWins = bWins;
        m.isTie = isTie;
        m.outcomeComputed = true;
        m.status = MatchStatus.Resolved;

        _grantOutcomePermissions(m);
        _updatePlayerStats(m.playerA, aWins, bWins, isTie);
        _updatePlayerStats(m.playerB, bWins, aWins, isTie);

        emit MatchResolved(matchId, outcome, aWins, bWins, isTie);
    }

    function _grantOutcomePermissions(Match storage m) private {
        address playerA = m.playerA;
        address playerB = m.playerB;

        FHE.allowThis(m.encryptedOutcome);
        FHE.allowThis(m.aWins);
        FHE.allowThis(m.bWins);
        FHE.allowThis(m.isTie);

        FHE.allow(m.encryptedOutcome, playerA);
        FHE.allow(m.encryptedOutcome, playerB);
        FHE.allow(m.aWins, playerA);
        FHE.allow(m.aWins, playerB);
        FHE.allow(m.bWins, playerA);
        FHE.allow(m.bWins, playerB);
        FHE.allow(m.isTie, playerA);
        FHE.allow(m.isTie, playerB);
    }

    function _updatePlayerStats(address player, ebool winsFlag, ebool lossesFlag, ebool tieFlag) private {
        PlayerStats storage stats = _stats[player];

        if (!stats.initialized) {
            stats.wins = FHE.asEuint32(0);
            stats.losses = FHE.asEuint32(0);
            stats.ties = FHE.asEuint32(0);
            stats.initialized = true;
            _grantStatsPermissions(stats, player);
        }

        euint32 winIncrement = FHE.select(winsFlag, FHE.asEuint32(1), FHE.asEuint32(0));
        euint32 lossIncrement = FHE.select(lossesFlag, FHE.asEuint32(1), FHE.asEuint32(0));
        euint32 tieIncrement = FHE.select(tieFlag, FHE.asEuint32(1), FHE.asEuint32(0));

        euint32 newWins = FHE.add(stats.wins, winIncrement);
        euint32 newLosses = FHE.add(stats.losses, lossIncrement);
        euint32 newTies = FHE.add(stats.ties, tieIncrement);

        stats.wins = newWins;
        stats.losses = newLosses;
        stats.ties = newTies;

        _grantStatsPermissions(stats, player);

        emit PlayerStatsUpdated(player, newWins, newLosses, newTies);
    }

    function _allowMoveForParticipants(euint8 move, address playerA, address playerB) private {
        FHE.allowThis(move);
        FHE.allow(move, playerA);
        FHE.allow(move, playerB);
    }

    function _grantStatsPermissions(PlayerStats storage stats, address player) private {
        FHE.allowThis(stats.wins);
        FHE.allowThis(stats.losses);
        FHE.allowThis(stats.ties);
        FHE.allow(stats.wins, player);
        FHE.allow(stats.losses, player);
        FHE.allow(stats.ties, player);
    }
}
