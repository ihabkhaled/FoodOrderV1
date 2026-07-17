#!/usr/bin/env node
import process from 'node:process';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  getFirestore,
} from 'firebase-admin/firestore';

const DEFAULT_BATCH_SIZE = 400;
const MAX_BATCH_SIZE = 450;

const parsePositiveInteger = (value, label, maximum) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`${label} must be an integer between 1 and ${maximum}.`);
  }
  return parsed;
};

const parseArguments = (arguments_) => {
  const options = {
    apply: false,
    batchSize: DEFAULT_BATCH_SIZE,
    projectId: process.env.GOOGLE_CLOUD_PROJECT?.trim() || undefined,
    limit: Number.POSITIVE_INFINITY,
  };

  for (const argument of arguments_) {
    if (argument === '--apply') {
      options.apply = true;
      continue;
    }
    if (argument === '--dry-run') {
      options.apply = false;
      continue;
    }
    if (argument.startsWith('--batch-size=')) {
      options.batchSize = parsePositiveInteger(
        argument.slice('--batch-size='.length),
        'Batch size',
        MAX_BATCH_SIZE,
      );
      continue;
    }
    if (argument.startsWith('--project=')) {
      const projectId = argument.slice('--project='.length).trim();
      if (!projectId) throw new Error('Project ID cannot be empty.');
      options.projectId = projectId;
      continue;
    }
    if (argument.startsWith('--limit=')) {
      options.limit = parsePositiveInteger(
        argument.slice('--limit='.length),
        'Limit',
        Number.MAX_SAFE_INTEGER,
      );
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
};

const createApplication = (projectId) =>
  initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });

const collectLegacyMemberReferences = async (firestore, limit) => {
  const snapshot = await firestore.collectionGroup('members').get();
  const references = [];
  let scanned = 0;

  for (const documentSnapshot of snapshot.docs) {
    scanned += 1;
    if (
      references.length < limit &&
      Object.prototype.hasOwnProperty.call(documentSnapshot.data(), 'email')
    ) {
      references.push(documentSnapshot.ref);
    }
  }

  return { references, scanned };
};

const applyMigration = async (firestore, references, batchSize) => {
  let updated = 0;

  for (let offset = 0; offset < references.length; offset += batchSize) {
    const batchReferences = references.slice(offset, offset + batchSize);
    const batch = firestore.batch();

    for (const reference of batchReferences) {
      batch.update(reference, {
        email: FieldValue.delete(),
        privacySchemaVersion: 1,
      });
    }

    await batch.commit();
    updated += batchReferences.length;
    console.log(
      JSON.stringify({
        event: 'member-privacy-batch-committed',
        updated,
        total: references.length,
      }),
    );
  }

  return updated;
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  const application = createApplication(options.projectId);
  const firestore = getFirestore(application);
  firestore.settings({ ignoreUndefinedProperties: true });

  const { references, scanned } = await collectLegacyMemberReferences(
    firestore,
    options.limit,
  );
  const summary = {
    mode: options.apply ? 'apply' : 'dry-run',
    projectId: application.options.projectId ?? 'application-default',
    scanned,
    matched: references.length,
    batchSize: options.batchSize,
  };
  console.log(JSON.stringify({ event: 'member-privacy-scan-complete', ...summary }));

  if (!options.apply) {
    console.log(
      JSON.stringify({
        event: 'member-privacy-dry-run-complete',
        ...summary,
        action: 'Run again with --apply after reviewing the target project and count.',
      }),
    );
    return;
  }

  const updated = await applyMigration(
    firestore,
    references,
    options.batchSize,
  );
  const verification = await collectLegacyMemberReferences(
    firestore,
    Number.POSITIVE_INFINITY,
  );
  if (verification.references.length > 0) {
    throw new Error(
      `Migration verification failed: ${verification.references.length} member documents still contain email.`,
    );
  }

  console.log(
    JSON.stringify({
      event: 'member-privacy-migration-complete',
      ...summary,
      updated,
      remaining: 0,
    }),
  );
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({ event: 'member-privacy-migration-failed', message }),
  );
  process.exitCode = 1;
});
