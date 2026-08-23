import { GameSession, ScoreTransaction, TeamId, GameStats } from '../types';

export class ScoringService {
  /**
   * Records a score transaction safely, ensuring no duplicate scoring on the same event
   */
  public static recordTransaction(
    session: GameSession,
    questionId: number,
    teamId: TeamId,
    type: 'RACE_CORRECT' | 'RACE_WRONG' | 'STEAL_CORRECT' | 'STEAL_WRONG' | 'SPECIAL_CORRECT',
    points: number
  ): { updatedSession: GameSession; transaction: ScoreTransaction | null } {
    // Check if this exact scoring event already exists in session history
    const existing = session.history.find(
      (tx) => tx.questionId === questionId && tx.teamId === teamId && tx.type === type
    );

    if (existing) {
      console.warn('Transaction already exists for this event, ignoring duplicate score');
      return { updatedSession: session, transaction: null };
    }

    const transaction: ScoreTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      questionId,
      teamId,
      type,
      points,
      timestamp: Date.now(),
    };

    const newHistory = [...session.history, transaction];
    let newBlueScore = session.blueScore;
    let newOrangeScore = session.orangeScore;

    if (teamId === 'blue') {
      newBlueScore += points;
    } else {
      newOrangeScore += points;
    }

    const updatedSession: GameSession = {
      ...session,
      blueScore: newBlueScore,
      orangeScore: newOrangeScore,
      history: newHistory,
      updatedAt: Date.now(),
    };

    return { updatedSession, transaction };
  }

  /**
   * Computes comprehensive statistics for the match
   */
  public static calculateStats(session: GameSession): GameStats {
    let blueWinsCamera = 0;
    let orangeWinsCamera = 0;
    let blueCorrect = 0;
    let orangeCorrect = 0;
    let blueStealCorrect = 0;
    let orangeStealCorrect = 0;
    let blueTotalAttempts = 0;
    let orangeTotalAttempts = 0;

    session.history.forEach((tx) => {
      if (tx.teamId === 'blue') {
        if (tx.type === 'RACE_CORRECT' || tx.type === 'SPECIAL_CORRECT') {
          blueWinsCamera++;
          blueCorrect++;
          blueTotalAttempts++;
        } else if (tx.type === 'RACE_WRONG') {
          blueWinsCamera++;
          blueTotalAttempts++;
        } else if (tx.type === 'STEAL_CORRECT') {
          blueStealCorrect++;
          blueTotalAttempts++;
        } else if (tx.type === 'STEAL_WRONG') {
          blueTotalAttempts++;
        }
      } else {
        if (tx.type === 'RACE_CORRECT' || tx.type === 'SPECIAL_CORRECT') {
          orangeWinsCamera++;
          orangeCorrect++;
          orangeTotalAttempts++;
        } else if (tx.type === 'RACE_WRONG') {
          orangeWinsCamera++;
          orangeTotalAttempts++;
        } else if (tx.type === 'STEAL_CORRECT') {
          orangeStealCorrect++;
          orangeTotalAttempts++;
        } else if (tx.type === 'STEAL_WRONG') {
          orangeTotalAttempts++;
        }
      }
    });

    return {
      totalQuestions: session.questions.length,
      blueWinsCamera,
      orangeWinsCamera,
      blueCorrect,
      orangeCorrect,
      blueStealCorrect,
      orangeStealCorrect,
      blueTotalAttempts,
      orangeTotalAttempts,
      fastestReactionTimeMs: session.winnerReactionTimeMs || 1200,
    };
  }
}
