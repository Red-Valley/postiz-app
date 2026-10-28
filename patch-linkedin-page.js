// Patches the compiled LinkedIn Page provider so it works with an app that only
// has the Community Management API product (no OpenID Connect).
// Every change must apply exactly as expected, otherwise the build fails.
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || '/app';
const targetName = 'linkedin.page.provider.js';

const findTargets = (dir, found = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findTargets(full, found);
    else if (entry.name === targetName) found.push(full);
  }
  return found;
};

// Maps /v2/me (needs r_basicprofile, granted) to the /v2/userinfo shape
// (needs openid + profile, not grantable next to Community Management).
const shim = `
const __rvsLinkedinFetch = async (url, options) => {
  if (url !== 'https://api.linkedin.com/v2/userinfo') return fetch(url, options);
  const me = await (await fetch('https://api.linkedin.com/v2/me', options)).json();
  const name = [me.localizedFirstName, me.localizedLastName].filter(Boolean).join(' ');
  return { json: async () => ({ sub: me.id, name, picture: undefined }) };
};
`;

const patches = [
  {
    name: 'drop openid and profile scopes',
    find: /(['"])openid\1,\s*(['"])profile\2,\s*/g,
    replace: '',
    expected: 1,
  },
  {
    name: 'drop prompt=none',
    find: /prompt=none&/g,
    replace: '',
    expected: 1,
  },
  {
    name: 'route /v2/userinfo through /v2/me',
    find: /\bfetch\((['"])https:\/\/api\.linkedin\.com\/v2\/userinfo\1/g,
    replace: "__rvsLinkedinFetch('https://api.linkedin.com/v2/userinfo'",
    expected: 2,
  },
];

const targets = findTargets(root);
console.log(`Found ${targets.length} target(s):\n  ${targets.join('\n  ')}`);
if (!targets.length) {
  console.error(`No ${targetName} under ${root}`);
  process.exit(1);
}

for (const file of targets) {
  let code = fs.readFileSync(file, 'utf8');
  for (const p of patches) {
    const count = (code.match(p.find) || []).length;
    if (count !== p.expected) {
      console.error(`${file}: "${p.name}" matched ${count}, expected ${p.expected}`);
      process.exit(1);
    }
    code = code.replace(p.find, p.replace);
  }
  code = code.includes('"use strict";')
    ? code.replace('"use strict";', `"use strict";${shim}`)
    : shim + code;
  fs.writeFileSync(file, code);
  console.log(`Patched ${file}`);
}
