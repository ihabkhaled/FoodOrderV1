#!/usr/bin/env node
/**
 * Legacy FoodOrder (React Native / RTDB) → FoodOrderV1 Firestore schema v2.
 *
 * Input: a Realtime Database JSON export shaped
 *   { usersData: { <uid>: { buckets: { <uuid>: { title, inputValues[] } } } } }
 * Output per bucket: top-level `buckets/{uuid}` (schema v2) + owner member doc
 * + owner membership mirror (see architecture/sharing-design.md §6).
 *
 * Safety: `--dry-run` prints the plan without writing; reruns are idempotent
 * (stable bucket ids, deterministic `legacy_<bucket>_<index>` item ids, full-doc
 * sets of identical content); no orders are fabricated (legacy never persisted
 * orders); the RTDB source is never modified, which is also the rollback path.
 *
 * Usage:
 *   npm run migrate:legacy -- export.json --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=key.json npm run migrate:legacy -- export.json
 */
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const args = process.argv.slice(2);
const file = args.find((value) => !value.startsWith('--'));
const dryRun = args.includes('--dry-run');
if (!file) {
  console.error('Usage: npm run migrate:legacy -- export.json [--dry-run]');
  process.exit(1);
}

const source = JSON.parse(await readFile(file, 'utf8'));
const now = new Date().toISOString();
const plans = [];

for (const [userId, userData] of Object.entries(source.usersData ?? {})) {
  for (const [bucketId, legacy] of Object.entries(userData.buckets ?? {})) {
    const items = (legacy.inputValues ?? [])
      .filter((name) => typeof name === 'string' && name.trim().length > 0)
      .slice(0, 50)
      .map((name, index) => ({
        id: `legacy_${bucketId}_${index}`,
        name: String(name).trim().slice(0, 60),
        description: '',
        category: '',
        unitPrice: 0,
        active: true,
        sortOrder: index,
      }));
    if (items.length === 0) continue;
    plans.push({
      userId,
      bucket: {
        id: bucketId,
        ownerId: userId,
        ownerName: 'Imported owner',
        title: String(legacy.title ?? 'Imported bucket').slice(0, 60),
        description: 'Imported from FoodOrder React Native',
        currency: 'EGP',
        visibility: 'private',
        status: 'active',
        schemaVersion: 2,
        revision: 1,
        items,
        aggregate: {},
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}

console.log(
  `Planned: ${plans.length} bucket(s) across ${new Set(plans.map((plan) => plan.userId)).size} user(s).`,
);
if (dryRun) {
  for (const plan of plans) {
    console.log(
      `  [dry-run] buckets/${plan.bucket.id} (owner ${plan.userId}, ${plan.bucket.items.length} items)`,
    );
  }
  process.exit(0);
}

const { applicationDefault, initializeApp } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const firestore = getFirestore(initializeApp({ credential: applicationDefault() }));

let migrated = 0;
for (const { userId, bucket } of plans) {
  const memberAt = new Date().toISOString();
  const batch = firestore.batch();
  batch.set(firestore.doc(`buckets/${bucket.id}`), bucket);
  batch.set(firestore.doc(`buckets/${bucket.id}/members/${userId}`), {
    userId,
    displayName: bucket.ownerName,
    email: '',
    role: 'owner',
    status: 'active',
    invitedBy: userId,
    joinedAt: memberAt,
    updatedAt: memberAt,
  });
  batch.set(firestore.doc(`users/${userId}/bucketMemberships/${bucket.id}`), {
    bucketId: bucket.id,
    role: 'owner',
    bucketTitle: bucket.title,
    ownerName: bucket.ownerName,
    joinedAt: memberAt,
  });
  await batch.commit();
  migrated += 1;
}
console.log(`Migrated ${migrated} bucket(s) to schema v2.`);
