/**
 * Deploy del sito su TopHost via FTP (FTP esplicito su TLS, modalità passiva).
 * Legge host, user, password e cartella remota da variabili d'ambiente.
 *
 * Configurazione TopHost:
 *   https://www.tophost.it/assistenza/supporto/domande-tecniche/pannello-di-controllo/configurazione-ftp/
 *
 * Uso:
 *   1. Copia .env.example in .env e inserisci i dati FTP.
 *   2. npm run deploy
 *
 * Variabili d'ambiente (o in .env):
 *   FTP_HOST      - es. thesurvivalist.net (o ftp.thesurvivalist.net)
 *   FTP_USER      - username FTP
 *   FTP_PASSWORD  - password FTP
 *   FTP_REMOTE    - cartella remota (es. public_html)
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('basic-ftp');

const ROOT = path.join(__dirname, '..');

/** File e cartelle da caricare (path relativi alla root del progetto). */
const UPLOAD = [
  'index.html',
  'logo.png',
  'torcha.html',
  'tally.html',
  'outlist.html',
  'simoa.html',
  'smuffer.html',
  'sutral.html',
  'edger.html',
  'global.css',
  'mobile.css',
  'theme.js',
  'torcha.js',
  'tally.js',
  'outlist.js',
  'simoa.js',
  'smuffer.js',
  'sutral.js',
  'edger.js',
  'index.js',
  'mobile-detection.js',
  'mobile-menu.js',
  'cast-shared.js',
  'dashboard-utils.js',
  'torcha-cards.json',
  'torcha-player-identities.json',
  'assets',
];

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('File .env non trovato. Copia .env.example in .env e inserisci host, user, password FTP.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach((line) => {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
  return env;
}

async function uploadDir(client, localDir, remoteDir) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  await client.ensureDir(remoteDir);
  for (const e of entries) {
    const localPath = path.join(localDir, e.name);
    const remotePath = remoteDir + '/' + e.name;
    if (e.isDirectory()) {
      await uploadDir(client, localPath, remotePath);
    } else {
      process.stdout.write('  ' + remotePath + ' ... ');
      await client.uploadFrom(localPath, remotePath);
      console.log('OK');
    }
  }
}

async function uploadFile(client, localPath, remotePath) {
  process.stdout.write('  ' + remotePath + ' ... ');
  await client.uploadFrom(localPath, remotePath);
  console.log('OK');
}

async function main() {
  const env = loadEnv();
  const host = env.FTP_HOST || process.env.FTP_HOST;
  const user = env.FTP_USER || process.env.FTP_USER;
  const password = env.FTP_PASSWORD || process.env.FTP_PASSWORD;
  const remoteDir = env.FTP_REMOTE || process.env.FTP_REMOTE || 'public_html';

  if (!host || !user || !password) {
    console.error('Imposta FTP_HOST, FTP_USER e FTP_PASSWORD in .env');
    process.exit(1);
  }

  const client = new Client(20000);
  client.ftp.verbose = false;

  try {
    console.log('Connessione a ' + host + ' (FTP esplicito TLS, passive) ...');
    await client.access({
      host,
      user,
      password,
      secure: true,
      secureOptions: { rejectUnauthorized: false },
    });
    console.log('Connesso.\nCaricamento in /' + remoteDir + ':\n');

    const baseRemote = remoteDir.replace(/\/$/, '');

    for (const item of UPLOAD) {
      const local = path.join(ROOT, item);
      if (!fs.existsSync(local)) {
        console.warn('  [skip] ' + item + ' (non trovato)');
        continue;
      }
      const stat = fs.statSync(local);
      if (stat.isDirectory()) {
        await uploadDir(client, local, baseRemote + '/' + item);
      } else {
        await uploadFile(client, local, baseRemote + '/' + item);
      }
    }

    console.log('\nDeploy completato.');
  } catch (err) {
    console.error('\nErrore:', err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
