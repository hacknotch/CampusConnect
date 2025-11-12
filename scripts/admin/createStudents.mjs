#!/usr/bin/env node
// Bulk-create Firebase Auth users from CSV and seed Firestore users/{uid}
// Usage: node scripts/admin/createStudents.mjs path/to/students.csv
// CSV headers (case-insensitive): name,email,dept,usn
// Requires: npm i firebase-admin csv-parse
// Auth: set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON.

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'mvjce@2027';

function initAdmin() {
  try {
    initializeApp({ credential: applicationDefault() });
  } catch (e) {
    // Fallback: try service account path via env ADMIN_SA
    const saPath = process.env.ADMIN_SA;
    if (!saPath) throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS or ADMIN_SA to a service account JSON path.');
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    initializeApp({ credential: cert(sa) });
  }
}

function norm(val) { return (val || '').toString().trim(); }

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('CSV path is required. Example: node scripts/admin/createStudents.mjs data/students.csv');
    process.exit(1);
  }

  initAdmin();
  const auth = getAuth();
  const db = getFirestore();

  const csvBuf = fs.readFileSync(file);
  const rows = parse(csvBuf, { columns: true, skip_empty_lines: true });

  let created = 0; let updated = 0; let failed = 0;
  for (const row of rows) {
    const email = norm(row.email || row.Email || row.EMAIL);
    const name = norm(row.name || row.Name || row.fullname || row.FullName);
    const dept = norm(row.dept || row.department || row.Department || 'CSE');
    const usn = norm(row.usn || row.USN || row.roll || row.Roll || '');
    if (!email) { console.warn('Skipping row without email:', row); failed++; continue; }

    try {
      // Try get user first
      let userRecord;
      try { userRecord = await auth.getUserByEmail(email); } catch (_) {}

      if (!userRecord) {
        userRecord = await auth.createUser({ email, password: DEFAULT_PASSWORD, emailVerified: false, displayName: name });
        created++;
      } else {
        updated++;
      }

      const uid = userRecord.uid;
      await db.doc(`users/${uid}`).set({
        name: name || email.split('@')[0],
        email,
        role: 'student',
        dept,
        usn,
        passwordChanged: false,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      console.log('✔', email, '->', uid);
    } catch (e) {
      failed++;
      console.error('✖ Failed for', email, e.message);
    }
  }

  console.log(`Done. created=${created} updated=${updated} failed=${failed}`);
}

main().catch(err => { console.error(err); process.exit(1); });
