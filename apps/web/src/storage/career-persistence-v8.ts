import {
  parseCareerSessionV8,
  type CareerSessionV8,
  type WrTacticalMechanicsV1,
} from '@project-saturday/game-core';
import {
  WrCareerPersistenceEngine,
  type CareerPersistenceOptions,
  type WrPersistenceCodec,
  type SaveCareerResult,
} from './career-persistence';
import { wrCompletionTransaction } from './wr-meta-storage';
import { createWrCareerEnvelopeV8, decodeWrCareerEnvelopeV8 } from './career-envelope-v8';
import type { StorageAdapter } from './storage';

/** Unselected v8 aggregate facade over the same conflict/recovery/transaction engine. */
export class WrCareerPersistenceV8 extends WrCareerPersistenceEngine<CareerSessionV8, unknown> {
  private readonly completionVersion: string;
  public constructor(
    storage: StorageAdapter,
    mechanics: WrTacticalMechanicsV1,
    options: CareerPersistenceOptions,
  ) {
    // A delayed write must not observe caller edits to its mechanics catalog.
    const catalog = structuredClone(mechanics);
    const codec: WrPersistenceCodec<CareerSessionV8, unknown> = {
      ownsSnapshot: (id) => !id.startsWith('position-alpha:'),
      preservePreviousEnvelope: true,
      // V8 requires the entire linked aggregate; never synthesize a world from a career alone.
      parseCareer: () => ({ ok: false }),
      createSession: () => null,
      parseSession: (value) => parseCareerSessionV8(value, catalog),
      readEnvelope: (value, version) => decodeWrCareerEnvelopeV8(value, version, catalog),
      makeEnvelope: (session, version, createdAt, updatedAt) =>
        createWrCareerEnvelopeV8(session, version, createdAt, updatedAt, catalog),
    };
    super(storage, options, codec);
    this.completionVersion = options.contentVersion;
  }

  public override saveSession(session: CareerSessionV8): Promise<SaveCareerResult<unknown>> {
    return session?.career?.terminalCompletion === undefined
      ? super.saveSession(session)
      : this.enqueueSessionSave(session, false, wrCompletionTransaction(this.completionVersion));
  }

  public override replaceCurrentSession(
    session: CareerSessionV8,
  ): Promise<SaveCareerResult<unknown>> {
    // Import/replacement cannot bypass the saved review and atomic alumni registration.
    return session?.career?.terminalCompletion === undefined
      ? super.replaceCurrentSession(session)
      : Promise.resolve({ ok: false, reason: 'career_save.protected_existing_save' });
  }
}
