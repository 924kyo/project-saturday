import {
  createWrTwoSeasonReviewV1,
  parseWrTwoSeasonReviewV1,
  parseCareerSessionV7,
  projectCompletedSeasonSummary,
  type CareerSessionV8,
  type WrTwoSeasonReviewV1,
  enterWrTwoSeasonReviewV8,
  parseCareerSessionV8,
  createWrTwoSeasonAlumniV1,
  parseWrTwoSeasonAlumniV1,
  unpackJsonArchiveV1,
  completeWrTwoSeasonCareerV8,
} from '@project-saturday/game-core';
import { matchesJsonEvidence } from './json-evidence.js';

/** Real-life profile assertions; does not publish or alter gameplay state. */
export function verifyWrReviewEvidence(session: CareerSessionV8): WrTwoSeasonReviewV1 {
  const source = parseCareerSessionV7({
    ...session,
    schemaVersion: 7,
    career: { ...session.career, schemaVersion: 7 },
  });
  if (!source.ok) throw new Error('Terminal source is not an exact neutral session');
  const review = createWrTwoSeasonReviewV1(source.session);
  if (review === null) throw new Error('Missing two-season review');
  if (!matchesJsonEvidence(parseWrTwoSeasonReviewV1(JSON.stringify(review)), review))
    throw new Error('Review reload mismatch');
  if (
    !matchesJsonEvidence(review.source, source.session) ||
    !matchesJsonEvidence(
      review.seasons[0].summary,
      source.session.career.seasonCareerState.lastCompletedSeason,
    ) ||
    !matchesJsonEvidence(review.careerTotals, session.career.gameCareerState)
  )
    throw new Error('Review changed source/history/totals');
  const current = source.session.career.seasonCareerState;
  if (
    current.bootstrapStatus !== 'ACTIVE' ||
    review.seasons[1].summary.gamesPlayed !== current.gameSummaries.length ||
    projectCompletedSeasonSummary(source.session)?.gamesPlayed !==
      review.careerTotals.gamesPlayed ||
    review.seasons[0].summary.gamesPlayed + review.seasons[1].summary.gamesPlayed !==
      review.careerTotals.gamesPlayed
  )
    throw new Error('Season versus career statistics mismatch');
  for (const malformed of [
    { ...review, extra: undefined },
    { ...review, model: 'wr_two_season_review_v2' },
    { ...review, source: { ...review.source, tacticalGame: review } },
    {
      ...review,
      source: {
        ...review.source,
        career: { ...review.source.career, phase: { type: 'WEEK_END' } },
      },
    },
    {
      ...review,
      source: { ...review.source, world: { ...review.source.world, completedSeasonHistory: [] } },
    },
    { ...review, seasons: [...review.seasons].reverse() },
    {
      ...review,
      seasons: [
        review.seasons[0],
        { ...review.seasons[1], summary: { ...review.seasons[1].summary, gamesPlayed: 999 } },
      ],
    },
    { ...review, careerTotals: { ...review.careerTotals, gamesPlayed: 999 } },
    { ...review, source: undefined },
  ])
    if (parseWrTwoSeasonReviewV1(malformed) !== null) throw new Error('Forged review accepted');
  if (
    !Object.isFrozen(review) ||
    !Object.isFrozen(review.source) ||
    !Object.isFrozen(review.seasons[1].summary)
  )
    throw new Error('Review is mutable');
  const entered = enterWrTwoSeasonReviewV8(session);
  if (
    !entered.ok ||
    entered.session.career.phase.type !== 'SEASON_REVIEW' ||
    entered.session.career.revision !== session.career.revision + 1 ||
    !matchesJsonEvidence(entered.session.world, session.world) ||
    !matchesJsonEvidence(entered.session.career.rng, session.career.rng)
  )
    throw new Error('Invalid current review publication');
  const loaded = parseCareerSessionV8(JSON.stringify(entered.session));
  if (!loaded.ok || !matchesJsonEvidence(loaded.session, entered.session))
    throw new Error('Current review session reload mismatch');
  const repeated = enterWrTwoSeasonReviewV8(entered.session);
  if (repeated.ok || repeated.session !== entered.session)
    throw new Error('Repeated review changed source');
  const { terminalReview: omitted, ...orphanCareer } = entered.session.career;
  if (omitted === undefined) throw new Error('Missing required terminal record');
  for (const malformed of [
    { ...entered.session, career: orphanCareer },
    { ...entered.session, extra: undefined },
    {
      ...entered.session,
      career: { ...entered.session.career, revision: entered.session.career.revision + 1 },
    },
    {
      ...entered.session,
      world: { ...entered.session.world, revision: entered.session.world.revision + 1 },
    },
  ])
    if (parseCareerSessionV8(malformed).ok) throw new Error('Forged current review accepted');
  const alumni = createWrTwoSeasonAlumniV1(review, 1);
  if (
    alumni === null ||
    !matchesJsonEvidence(parseWrTwoSeasonAlumniV1(JSON.stringify(alumni)), alumni)
  )
    throw new Error('Alumni source replay failed');
  const archive = unpackJsonArchiveV1(alumni.reviewArchive);
  if (
    !archive.ok ||
    !matchesJsonEvidence(archive.value, review) ||
    !matchesJsonEvidence(alumni.careerStats, review.careerTotals.cumulativeStats) ||
    !matchesJsonEvidence(alumni.appearance, session.career.player.appearance) ||
    alumni.seasonsPlayed !== 2 ||
    alumni.gamesPlayed !== review.careerTotals.gamesPlayed ||
    alumni.injuryEvidence[0].recordedCount !== review.seasons[0].summary.injuryCount ||
    alumni.injuryEvidence[0].outcomeIds !== null ||
    alumni.programIds.length !== new Set(review.seasons.map(({ programId }) => programId)).size
  )
    throw new Error('Alumni lost identity/history or invented incidents');
  for (const malformed of [
    { ...alumni, extra: undefined },
    { ...alumni, seasonsPlayed: 1 },
    { ...alumni, gamesPlayed: 999 },
    { ...alumni, reviewArchive: undefined },
    { ...alumni, programIds: [] },
    { ...alumni, endingId: 'career_ending_one_season_complete' },
    {
      ...alumni,
      injuryEvidence: [{ ...alumni.injuryEvidence[0], outcomeIds: [] }, alumni.injuryEvidence[1]],
    },
  ])
    if (parseWrTwoSeasonAlumniV1(malformed) !== null) throw new Error('Forged alumni accepted');
  const completed = completeWrTwoSeasonCareerV8(entered.session, 1);
  if (
    !completed.ok ||
    completed.session.career.phase.type !== 'CAREER_COMPLETE' ||
    completed.session.career.revision !== entered.session.career.revision + 1 ||
    !matchesJsonEvidence(completed.alumni, alumni) ||
    !matchesJsonEvidence(completed.session.world, entered.session.world) ||
    !matchesJsonEvidence(completed.session.career.rng, entered.session.career.rng) ||
    !matchesJsonEvidence(
      completed.session.career.seasonCareerState,
      entered.session.career.seasonCareerState,
    ) ||
    !matchesJsonEvidence(
      completed.session.career.offFieldCareerState,
      entered.session.career.offFieldCareerState,
    )
  )
    throw new Error('Retirement changed played history or produced incorrect alumni');
  const completedReload = parseCareerSessionV8(JSON.stringify(completed.session));
  if (!completedReload.ok || !matchesJsonEvidence(completedReload.session, completed.session))
    throw new Error('Retirement reload mismatch');
  const duplicate = completeWrTwoSeasonCareerV8(completed.session, 1);
  if (duplicate.ok || duplicate.session !== completed.session)
    throw new Error('Duplicate retirement changed input');
  const invalidVersion = completeWrTwoSeasonCareerV8(entered.session, 0);
  if (invalidVersion.ok || invalidVersion.session !== entered.session)
    throw new Error('Invalid content version accepted');
  const { terminalCompletion: removed, ...orphanCompleted } = completed.session.career;
  if (removed === undefined) throw new Error('Completion marker missing');
  for (const malformed of [
    { ...completed.session, career: orphanCompleted },
    {
      ...completed.session,
      career: {
        ...completed.session.career,
        terminalCompletion: { ...removed, alumniId: 'alumni_wrong' },
      },
    },
    {
      ...completed.session,
      career: {
        ...completed.session.career,
        terminalCompletion: { ...removed, contentVersion: 0 },
      },
    },
  ])
    if (parseCareerSessionV8(malformed).ok) throw new Error('Forged completion accepted');
  return review;
}
