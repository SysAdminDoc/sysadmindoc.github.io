#!/usr/bin/env node
// Validate the built /resume.json against the published JSON Resume schema.
//
// src/pages/resume.json.ts advertises the v1.0.0 schema in its `$schema` field,
// but nothing checked the export actually satisfied it: test/resume-schema.test.mjs
// only asserts ISO date formats and ordering on the career source data. That left
// the endpoint free to drift from the contract it claims, which matters because
// the whole point of the export is that an ATS or a JSON Resume theme can read it
// without knowing anything about this site.
//
// This runs against dist/, so it belongs in build:ci rather than the node test
// suite — `npm test` runs before `npm run build` in deploy:preflight, so a test
// that needs a built artifact would skip in exactly the gate that matters.
//
//   --dist <path>   audit a different output directory
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { schema } from '@jsonresume/schema';
import { Validator } from 'jsonschema';

const root = process.cwd();
const distIndex = process.argv.indexOf('--dist');
const distDir = path.resolve(root, distIndex === -1 ? 'dist' : process.argv[distIndex + 1]);
const resumePath = path.join(distDir, 'resume.json');

if (!fs.existsSync(resumePath)) {
  console.error(`audit-resume-schema: ${resumePath} not found. Run the build first.`);
  process.exit(1);
}

let resume;
try {
  resume = JSON.parse(fs.readFileSync(resumePath, 'utf8'));
} catch (error) {
  console.error(`audit-resume-schema: ${resumePath} is not valid JSON: ${error.message}`);
  process.exit(1);
}

console.log('Resume schema audit');
console.log(`  document: ${path.relative(root, resumePath).replace(/\\/g, '/')}`);
console.log(`  declared $schema: ${resume.$schema ?? '(missing)'}`);

if (!resume.$schema) {
  console.error('audit-resume-schema: the export must declare the $schema it claims to satisfy.');
  process.exit(1);
}

const result = new Validator().validate(resume, schema);
if (!result.valid) {
  console.error(`audit-resume-schema: ${result.errors.length} schema violation(s):`);
  for (const error of result.errors) {
    console.error(`  - ${error.property} ${error.message}`);
  }
  process.exit(1);
}
console.log(`  schema: valid against @jsonresume/schema (${result.errors.length} errors)`);

// The schema sets additionalProperties: true, so a field it does not declare is
// still valid — and silently ignored by every consumer that follows the spec.
// Report those rather than failing: they are not violations, but a field no
// parser reads is not doing the job it was added for.
function unknownFields(value, node, trail) {
  if (!node?.properties || !value || typeof value !== 'object') return [];
  const declared = new Set(Object.keys(node.properties));
  const found = [];
  for (const key of Object.keys(value)) {
    if (key.startsWith('$')) continue;
    if (!declared.has(key)) {
      found.push(`${trail}.${key}`);
      continue;
    }
    const child = node.properties[key];
    if (child?.type === 'array' && child.items?.properties && Array.isArray(value[key])) {
      for (const entry of value[key]) found.push(...unknownFields(entry, child.items, `${trail}.${key}[]`));
    } else if (child?.properties) {
      found.push(...unknownFields(value[key], child, `${trail}.${key}`));
    }
  }
  return found;
}

const nonStandard = [...new Set(unknownFields(resume, schema, 'resume'))].sort();
if (nonStandard.length > 0) {
  console.log(`  non-standard fields (valid, but no spec-following consumer reads them): ${nonStandard.join(', ')}`);
} else {
  console.log('  non-standard fields: none');
}

console.log('Resume schema audit passed.');
