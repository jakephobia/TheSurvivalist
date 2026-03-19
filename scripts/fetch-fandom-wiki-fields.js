/**
 * Fetches tribe (initial tribe) and age (at taping) from survivor.fandom.com contestant
 * pages and from Wikipedia season pages (Survivor: Borneo, etc.), updates torcha-cards.json.
 * Quotes are not fetched; any existing quote on cards is removed.
 *
 * Usage: node scripts/fetch-fandom-wiki-fields.js [--dry-run] [--limit N] [--season S] [--missing-only] [--ids id1,id2,...] [--wikipedia-only]
 *   --dry-run       don't write torcha-cards.json
 *   --limit N       process at most N cards
 *   --season S      only process cards from season S (e.g. 1 or 28)
 *   --missing-only  only process cards that have no tribe or age yet
 *   --ids id1,id2   only process these card ids
 *   --wikipedia-only  only use Wikipedia season pages (no Fandom)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CARDS_PATH = path.join(__dirname, '..', 'torcha-cards.json');
const API_BASE = 'https://survivor.fandom.com/api.php';
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';

/** Season number → name as used on Fandom (tabs/section headers) */
const SEASON_TO_FANDOM_NAME = {
  1: 'Borneo',
  2: 'The Australian Outback',
  3: 'Africa',
  4: 'Marquesas',
  5: 'Thailand',
  6: 'The Amazon',
  7: 'Pearl Islands',
  8: 'All-Stars',
  9: 'Vanuatu',
  10: 'Palau',
  11: 'Guatemala',
  12: 'Panama',
  13: 'Cook Islands',
  14: 'Fiji',
  15: 'China',
  16: 'Micronesia',
  17: 'Gabon',
  18: 'Tocantins',
  19: 'Samoa',
  20: 'Heroes vs. Villains',
  21: 'Nicaragua',
  22: 'Redemption Island',
  23: 'South Pacific',
  24: 'One World',
  25: 'Philippines',
  26: 'Caramoan',
  27: 'Blood vs. Water',
  28: 'Cagayan',
  29: 'San Juan del Sur',
  30: 'Worlds Apart',
  31: 'Cambodia',
  32: "Kaôh Rōng",
  33: 'Millennials vs. Gen X',
  34: 'Game Changers',
  35: 'Heroes vs. Healers vs. Hustlers',
  36: 'Ghost Island',
  37: 'David vs. Goliath',
  38: 'Edge of Extinction',
  39: 'Island of the Idols',
  40: 'Winners at War',
  41: 'Survivor 41',
  42: 'Survivor 42',
  43: 'Survivor 43',
  44: 'Survivor 44',
  45: 'Survivor 45',
  46: 'Survivor 46',
  47: 'Survivor 47',
  48: 'Survivor 48',
  49: 'Survivor 49',
  50: 'Survivor 50',
};

/** Card id → Fandom wiki page title when it differs from id-based slug */
const WIKI_SLUG_OVERRIDES = new Map([
  ['bill-bb-andersen:s01', 'B.B._Andersen'],
  ['sonja-christopher:s01', 'Sonja_Christopher'],
  ['stacey-stillman:s01', 'Stacey_Stillman'],
  ['ramona-gray:s01', 'Ramona_Gray'],
  ['dirk-been:s01', 'Dirk_Been'],
  ['boston-rob-mariano:s04', 'Rob_Mariano'],
  ['boston-rob-mariano:s08', 'Rob_Mariano'],
  ['rob-mariano:s20', 'Rob_Mariano'],
  ['rob-mariano:s22', 'Rob_Mariano'],
  ['rob-mariano:s40', 'Rob_Mariano'],
  ['amber-brkich:s02', 'Amber_Brkich'],
  ['amber-brkich:s08', 'Amber_Brkich'],
  ['amber-mariano:s40', 'Amber_Mariano'],
  ['alexis-lex-van-den-berghe:s03', 'Lex_van_den_Berghe'],
  ['alexis-lex-van-den-berghe:s08', 'Lex_van_den_Berghe'],
  ['tom-big-tom-buchanan:s03', 'Tom_Buchanan'],
  ['tom-buchanan:s08', 'Tom_Buchanan'],
  ['kathleen-kathy-vavrick-obrien:s04', "Kathy_Vavrick-O'Brien"],
  ['kathy-vavrick-obrien:s08', "Kathy_Vavrick-O'Brien"],
  ['danielle-dilorenz:s12', 'Danielle_DiLorenzo'],
  ['danielle-dilorenzo:s20', 'Danielle_DiLorenzo'],
  ['candice-woodcock:s13', 'Candice_Woodcock'],
  ['candice-woodcock:s20', 'Candice_Woodcock'],
  ['candice-cody:s27', 'Candice_Cody'],
  ['kim-spradlin:s24', 'Kim_Spradlin'],
  ['kim-spradlin-wolfe:s40', 'Kim_Spradlin-Wolfe'],
  ['benjamin-coach-wade:s18', 'Benjamin_Wade'],
  ['benjamin-coach-wade:s20', 'Benjamin_Wade'],
  ['benjamin-coach-wade:s23', 'Benjamin_Wade'],
  ['benjamin-coach-wade:s50', 'Benjamin_Wade'],
  ['james-jt-thomas-jr:s18', "J.T._Thomas"],
  ['james-jt-thomas-jr:s20', "J.T._Thomas"],
  ['james-jt-thomas-jr:s34', "J.T._Thomas"],
  ['rob-cesternin:s06', 'Rob_Cesternino'],
  ['rob-cesternino:s08', 'Rob_Cesternino'],
  ['jon-jonny-fairplay-dalton:s07', 'Jon_Dalton'],
  ['danielle-danni-boatwright:s11', 'Danni_Boatwright'],
  ['danielle-danni-boatwright:s40', 'Danni_Boatwright'],
  ['jessica-sugar-kiper:s17', 'Jessica_Kiper'],
  ['jessica-sugar-kiper:s20', 'Jessica_Kiper'],
  ['troy-troyzan-robertson:s24', 'Troyzan_Robertson'],
  ['troy-troyzan-robertson:s34', 'Troyzan_Robertson'],
  ['kassandra-kass-mcquillen:s28', 'Kass_McQuillen'],
  ['kassandra-kass-mcquillen:s31', 'Kass_McQuillen'],
  ['stephenie-lagrossa:s10', 'Stephenie_LaGrossa'],
  ['stephenie-lagrossa:s11', 'Stephenie_LaGrossa'],
  ['stephenie-lagrossa:s20', 'Stephenie_LaGrossa'],
  ['stephenie-lagrossa:s50', 'Stephenie_LaGrossa'],
  ['sandra-diaz-twine:s07', 'Sandra_Diaz-Twine'],
  ['sandra-diaz-twine:s20', 'Sandra_Diaz-Twine'],
  ['sandra-diaz-twine:s34', 'Sandra_Diaz-Twine'],
  ['sandra-diaz-twine:s40', 'Sandra_Diaz-Twine'],
  ['parvati-shallow:s13', 'Parvati_Shallow'],
  ['parvati-shallow:s16', 'Parvati_Shallow'],
  ['parvati-shallow:s20', 'Parvati_Shallow'],
  ['parvati-shallow:s40', 'Parvati_Shallow'],
  ['ozzy-lusth:s13', 'Ozzy_Lusth'],
  ['ozzy-lusth:s16', 'Ozzy_Lusth'],
  ['ozzy-lusth:s23', 'Ozzy_Lusth'],
  ['ozzy-lusth:s34', 'Ozzy_Lusth'],
  ['ozzy-lusth:s50', 'Ozzy_Lusth'],
  ['cirie-fields:s12', 'Cirie_Fields'],
  ['cirie-fields:s16', 'Cirie_Fields'],
  ['cirie-fields:s20', 'Cirie_Fields'],
  ['cirie-fields:s34', 'Cirie_Fields'],
  ['cirie-fields:s50', 'Cirie_Fields'],
  ['sarah-lacina:s28', 'Sarah_Lacina'],
  ['sarah-lacina:s34', 'Sarah_Lacina'],
  ['sarah-lacina:s40', 'Sarah_Lacina'],
  ['tyson-apostol:s18', 'Tyson_Apostol'],
  ['tyson-apostol:s20', 'Tyson_Apostol'],
  ['tyson-apostol:s27', 'Tyson_Apostol'],
  ['tyson-apostol:s40', 'Tyson_Apostol'],
  ['malcolm-freberg:s25', 'Malcolm_Freberg'],
  ['malcolm-freberg:s26', 'Malcolm_Freberg'],
  ['malcolm-freberg:s34', 'Malcolm_Freberg'],
  ['andrea-boehlke:s22', 'Andrea_Boehlke'],
  ['andrea-boehlke:s26', 'Andrea_Boehlke'],
  ['andrea-boehlke:s34', 'Andrea_Boehlke'],
  ['michaela-bradshaw:s33', 'Michaela_Bradshaw'],
  ['michaela-bradshaw:s34', 'Michaela_Bradshaw'],
  ['zeke-smith:s33', 'Zeke_Smith'],
  ['zeke-smith:s34', 'Zeke_Smith'],
  ['debb-eaton:s02', 'Debb_Eaton'],
  ['kel-gleason:s02', 'Kel_Gleason'],
  ['maralyn-mad-dog-hershey:s02', 'Maralyn_Hershey'],
  ['mitchell-olson:s02', 'Mitchell_Olson'],
  ['elisabeth-filarski:s02', 'Elisabeth_Filarski'],
  ['rodger-bingham:s02', 'Rodger_Bingham'],
  ['nick-brown:s02', 'Nick_Brown'],
  ['alicia-calaway:s02', 'Alicia_Calaway'],
  ['alicia-calaway:s08', 'Alicia_Calaway'],
  ['colby-donaldson:s02', 'Colby_Donaldson'],
  ['colby-donaldson:s08', 'Colby_Donaldson'],
  ['colby-donaldson:s20', 'Colby_Donaldson'],
  ['colby-donaldson:s50', 'Colby_Donaldson'],
  ['jerri-manthey:s02', 'Jerri_Manthey'],
  ['jerri-manthey:s08', 'Jerri_Manthey'],
  ['jerri-manthey:s20', 'Jerri_Manthey'],
  ['tina-wesson:s02', 'Tina_Wesson'],
  ['tina-wesson:s08', 'Tina_Wesson'],
  ['tina-wesson:s27', 'Tina_Wesson'],
  ['ethan-zohn:s03', 'Ethan_Zohn'],
  ['ethan-zohn:s08', 'Ethan_Zohn'],
  ['ethan-zohn:s40', 'Ethan_Zohn'],
  ['teresa-cooper:s03', 'Teresa_Cooper'],
  ['tom-big-tom-buchanan:s03', 'Tom_Buchanan'],
  ['alexis-lex-van-den-berghe:s03', 'Lex_van_den_Berghe'],
  ['kim-johnson:s03', 'Kim_Johnson'],
  ['vecepia-towery:s04', 'Vecepia_Towery'],
  ['neleh-dennis:s04', 'Neleh_Dennis'],
  ['paschal-pappy-english:s04', 'Paschal_English'],
  ['kathleen-kathy-vavrick-obrien:s04', "Kathy_Vavrick-O'Brien"],
  ['robert-the-general-decani:s04', 'Robert_DeCanio'],
  ['zoe-zanidakis:s04', 'Zoe_Zanidakis'],
  ['tammy-leitner:s04', 'Tammy_Leitner'],
  ['sean-rector:s04', 'Sean_Rector'],
  ['gina-crews:s04', 'Gina_Crews'],
  ['gabriel-gabe-cade:s04', 'Gabe_Cade'],
  ['sarah-jones:s04', 'Sarah_Jones'],
  ['hunter-ellis:s04', 'Hunter_Ellis'],
  ['patricia-jackson:s04', 'Patricia_Jackson'],
  ['peter-harkey:s04', 'Peter_Harkey'],
  ['john-raymond:s05', 'John_Raymond'],
  ['ted-rogers,-jr:s05', 'Ted_Rogers,_Jr.'],
  ['jan-gentry:s05', 'Jan_Gentry'],
  ['helen-glover:s05', 'Helen_Glover'],
  ['jake-billingsley:s05', 'Jake_Billingsley'],
  ['brian-heidik:s05', 'Brian_Heidik'],
  ['clay-jordan:s05', 'Clay_Jordan'],
  ['penny-ramsey:s05', 'Penny_Ramsey'],
  ['ernie-collins:s05', 'Erin_Collins'],
  ['kenneth-ken-stafford:s05', 'Ken_Stafford'],
  ['robert-robb-zbacnik:s05', 'Robb_Zbacnik'],
  ['ghandia-johnson:s05', 'Ghandia_Johnson'],
  ['stephanie-dill:s05', 'Stephanie_Dill'],
  ['jed-hildebrand:s05', 'Jed_Hildebrand'],
  ['tanya-vance:s05', 'Tanya_Vance'],
  ['nicole-delma:s07', 'Nicole_Delma'],
  ['rupert-boneham:s07', 'Rupert_Boneham'],
  ['rupert-boneham:s08', 'Rupert_Boneham'],
  ['rupert-boneham:s20', 'Rupert_Boneham'],
  ['rupert-boneham:s27', 'Rupert_Boneham'],
  ['jon-jonny-fairplay-dalton:s07', 'Jon_Dalton'],
  ['burton-roberts:s07', 'Burton_Roberts'],
  ['darrah-johnson:s07', 'Darrah_Johnson'],
  ['lillian-morris:s07', 'Lillian_Morris'],
  ['tijuana-bradley:s07', 'Tijuana_Bradley'],
  ['christa-hastie:s07', 'Christa_Hastie'],
  ['ryan-shoulders:s07', 'Ryan_Shoulders'],
  ['andrew-savage:s07', 'Andrew_Savage'],
  ['andrew-savage:s31', 'Andrew_Savage'],
  ['shawn-cohen:s07', 'Shawn_Cohen'],
  ['osten-taylor:s07', 'Osten_Taylor'],
  ['michelle-tesaur:s07', 'Michelle_Tesauro'],
  ['trish-dunn:s07', 'Trish_Dunn'],
  ['skinny-ryan-s07', 'Ryan_Aiken'],
  ['yesenia-jessie-camach:s03', 'Jessie_Camacho'],
  ['kimberly-kim-powers:s03', 'Kim_Powers'],
  ['james-chad-crittenden:s09', 'Chad_Crittenden'],
  ['lea-sarge-masters:s09', 'Sarge_Masters'],
  ['travis-bubba-sampson:s09', 'Bubba_Sampson'],
  ['john-jp-palyok:s09', 'J.P._Palyok'],
  ['janean-dolly-neely:s09', 'Dolly_Neely'],
  ['cassandra-angie-jakusz:s10', 'Angie_Jakusz'],
  ['amy-ohara:s11', "Amy_O'Hara"],
  ['morgan-mcdevitt:s11', 'Morgan_McDevitt'],
  ['james-jim-lynch:s11', 'Jim_Lynch'],
  ['nicholas-nick-stanbury:s12', 'Nick_Stanbury'],
  ['rebekah-becky-lee:s13', 'Becky_Lee'],
  ['nathan-nate-gonzalez:s13', 'Nate_Gonzalez'],
  ['jenny-guzon-bae:s13', 'Jenny_Guzon-Bae'],
  ['bradley-brad-virata:s13', 'Brad_Virata'],
  ['jessica-flicka-smith:s13', 'Flicka_Smith'],
  ['anh-tuan-cao-boi-bui:s13', 'Cao_Boi_Bui'],
  ['john-paul-jp-calderon:s13', 'J.P._Calderon'],
  ['andria-dreamz-herd:s14', 'Dreamz_Herd'],
  ['yau-man-chan:s14', 'Yau-Man_Chan'],
  ['yau-man-chan:s16', 'Yau-Man_Chan'],
  ['kenward-boo-bernis:s14', 'Boo_Bernis'],
  ['alejandro-alex-angarita:s14', 'Alex_Angarita'],
  ['lisette-lisi-linares:s14', 'Lisi_Linares'],
  ['james-rocky-reid:s14', 'Rocky_Reid'],
  ['peih-gee-law:s15', 'Peih-Gee_Law'],
  ['peih-gee-law:s31', 'Peih-Gee_Law'],
  ['michael-frosti-zernow:s15', 'Frosti_Zernow'],
  ['jean-robert-bellande:s15', 'Jean-Robert_Bellande'],
  ['steve-chicken-morris:s15', 'Chicken_Morris'],
  ['tracy-hughes-wolf:s16', 'Tracy_Hughes-Wolf'],
  ['kathleen-kathy-sleckman:s16', 'Kathy_Sleckman'],
  ['michael-mikey-b-bortone:s16', 'Mikey_Bortone'],
  ['robert-bob-crowley:s17', 'Bob_Crowley'],
  ['jesusita-susie-smith:s17', 'Susie_Smith'],
  ['danny-gc-brown:s17', 'GC_Brown'],
  ['paloma-soto-castill:s17', 'Paloma_Soto-Castillo'],
  ['tamara-taj-johnson-george:s18', 'Taj_Johnson-George'],
  ['debra-debbie-beebe:s18', 'Debbie_Beebe'],
  ['shannon-shambo-waters:s19', 'Shambo_Waters'],
  ['brendan-shapir:s36', 'Brendan_Shapiro'],
  ['devon-pint:s35', 'Devon_Pinto'],
  ['john-paul-jp-hilsabeck:s35', 'JP_Hilsabeck'],
  ['desiree-desi-williams:s35', 'Desi_Williams'],
  ['alexandrea-ali-elliott:s35', 'Ali_Elliott'],
  ['lauren-oconnell:s38', "Lauren_O'Connell"],
  ['aurora-mccreary:s38', 'Aurora_McCreary'],
  ['dan-wardog-dasilva:s38', 'Wardog_DaSilva'],
  ['tramese-missy-byrd:s39', 'Missy_Byrd'],
  ['alexander-xander-hastings:s41', 'Xander_Hastings'],
  ['ricard-foye:s41', 'Ricard_Foyé'],
  ['danny-mccray:s41', 'Danny_Mccray'],
  ['shantel-shan-smith:s41', 'Shan_Smith'],
  ['evelyn-evvie-jagoda:s41', 'Evvie_Jagoda'],
  ['jairus-jd-robinson:s41', 'JD_Robinson'],
  ['michael-mike-turner:s42', 'Mike_Turner'],
  ['andrea-drea-wheeler:s42', 'Drea_Wheeler'],
  ['zachary-zach-wurtenberger:s42', 'Zach_Wurtenberger'],
  ['elisabeth-elie-scott:s43', 'Elie_Scott'],
  ['yamil-yam-yam-aroch:s44', 'Yam_Yam_Arocho'],
  ['heidi-lagares-greenblatt:s44', 'Heidi_Lagares-Greenblatt'],
  ['matthew-matt-blankinship:s44', 'Matt_Blankinship'],
  ['matthew-grinstead-mayle:s44', 'Matthew_Grinstead-Mayle'],
  ['dianelys-dee-valladares:s45', 'Dee_Valladares'],
  ['dianelys-dee-valladares:s50', 'Dee_Valladares'],
  ['jake-okane:s45', "Jake_O'Kane"],
  ['kendra-mcquarrie:s45', 'Kendra_McQuarrie'],
  ['nicholas-sifu-alsup:s45', 'Sifu_Alsup'],
  ['janani-j-maya-krishnan-jha:s45', 'J._Maya'],
  ['brandon-brando-meyer:s45', 'Brando_Meyer'],
  ['quintavius-q-burdette:s46', 'Q_Burdette'],
  ['quintavius-q-burdette:s50', 'Q_Burdette'],
  ['hunter-mcknight:s46', 'Hunter_McKnight'],
  ['sodasia-soda-thompson:s46', 'Soda_Thompson'],
  ['jemila-jem-hussain-adams:s46', 'Jem_Hussain-Adams'],
  ['randen-montalv:s46', 'Randen_Montalvo'],
  ['jessica-jess-chong:s46', 'Jess_Chong'],
  ['rachel-lamont:s47', 'Rachel_LaMont'],
  ['teeny-chirichill:s47', 'Teeny_Chirichillo'],
  ['solomon-sol-yi:s47', 'Sol_Yi'],
  ['jerome-rome-cooney:s47', 'Rome_Cooney'],
  ['terran-tk-foster:s47', 'TK_Foster'],
  ['cedrek-mcfadden:s48', 'Cedrek_McFadden'],
  ['saiounia-sai-hughley:s48', 'Sai_Hughley'],
  ['sage-ahrens-nichols:s49', 'Sage_Ahrens-Nichols'],
  ['michelle-mc-chukwujekwu:s49', 'MC_Chukwujekwu'],
  ['kimberly-annie-davis:s49', 'Annie_Davis'],
  ['nicole-mazull:s49', 'Nicole_Mazullo'],
  ['alec-merlin:s37', 'Alec_Merlino'],
  ['gabriel-gabe-cade:s04', 'Gabriel_Cade'],
  ['jud-fabio-birza:s21', 'Fabio_Birza'],
  ['dan-lemb:s21', 'Dan_Lembo'],
  ['marty-piomb:s21', 'Marty_Piombo'],
  ['matthew-sash-lenahan:s21', 'Sash_Lenahan'],
  ['ben-benry-henry:s21', 'Benry_Henry'],
  ['naonka-mixon:s21', 'NaOnka_Mixon'],
  ['yvette-yve-rojas:s21', 'Yve_Rojas'],
  ['jimmy-tarantin:s21', 'Jimmy_Tarantino'],
  ['mark-papa-bear-carus:s23', 'Papa_Bear_Caruso'],
  ['greg-tarzan-smith:s24', 'Tarzan_Smith'],
  ['peter-pete-yurkowski:s25', 'Pete_Yurkowski'],
  ['roberta-rc-saint-amour:s25', 'R.C._Saint-Amour'],
  ['roxanne-roxy-morris:s25', 'Roxy_Morris'],
  ['edward-eddie-fox:s26', 'Eddie_Fox'],
  ['yung-woo-hwang:s28', 'Woo_Hwang'],
  ['yung-woo-hwang:s31', 'Woo_Hwang'],
  ['latasha-tasha-fox:s28', 'Tasha_Fox'],
  ['latasha-tasha-fox:s31', 'Tasha_Fox'],
  ['leon-joseph-lj-mckanas:s28', 'LJ_McKanas'],
  ['morgan-mcleod:s28', 'Morgan_McLeod'],
  ['jtia-taylor:s28', "J'Tia_Taylor"],
  ['julie-mcgee:s29', 'Julie_McGee'],
  ['will-sims-ii:s30', 'Will_Sims_II'],
  ['rodney-lavoie-jr:s30', 'Rodney_Lavoie_Jr.'],
  ['vince-sly:s30', 'Vince_Sly'],
  ['charlotte-so-kim:s30', 'So_Kim'],
  ['aubry-bracco:s32', 'Aubry_Bracco'],
  ['aubry-bracco:s34', 'Aubry_Bracco'],
  ['aubry-bracco:s38', 'Aubry_Bracco'],
  ['aubry-bracco:s50', 'Aubry_Bracco'],
  ['nick-maioran:s32', 'Nick_Maiorano'],
  ['elisabeth-liz-markham:s32', 'Liz_Markham'],
  ['ken-mcnickle:s33', 'Ken_McNickle'],
  ['hannah-shapir:s33', 'Hannah_Shapiro'],
  ['bret-labelle:s33', 'Bret_LaBelle'],
  ['justin-jay-starrett:s33', 'Jay_Starrett'],
  ['taylor-lee-stocker:s33', 'Taylor_Stocker'],
  ['jessica-figgy-figueroa:s33', 'Figgy_Figueroa'],
  ['ciandre-cece-taylor:s33', 'CeCe_Taylor'],
  ['elizabeth-liz-kim:s19', 'Liz_Kim'],
]);

/** Build wiki slug from display name (fallback when id-based slug fails). */
function slugFromName(name) {
  if (!name || typeof name !== 'string') return null;
  return name
    .replace(/\s*"[^"]*"\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/,_/g, ',_')
    .replace(/\./g, '.');
}

function slugFromCard(card) {
  const override = WIKI_SLUG_OVERRIDES.get(card.id);
  if (override) return override;
  const part = (card.id || '').split(':')[0] || '';
  return part
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + (s.slice(1) || ''))
    .join('_')
    .replace(/_+/g, '_');
}

const REQUEST_HEADERS = {
  'User-Agent': 'Survivalist-Torcha/1.0 (https://github.com/ylan93/surv2; wiki data)',
  Accept: 'application/json',
};

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      url,
      { method: 'GET', headers: REQUEST_HEADERS },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (loc) return get(loc.startsWith('http') ? loc : new URL(loc, url).href).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(url + ' → ' + res.statusCode));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }
    );
    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

/** Get wikitext of a Fandom page via API */
async function getWikiContent(wikiSlug) {
  const title = encodeURIComponent(wikiSlug.replace(/\s/g, '_'));
  const url = `${API_BASE}?action=query&titles=${title}&prop=revisions&rvprop=content&rvslots=main&formatversion=2&format=json`;
  const body = await get(url);
  const data = JSON.parse(body);
  const pages = data.query?.pages || [];
  const page = pages[0];
  if (!page || page.missing) return null;
  const main = page.revisions?.[0]?.slots?.main;
  const content = main?.content ?? main?.['*'];
  return content || null;
}

/** Season number → Wikipedia page title (e.g. "Survivor: Borneo", "Survivor 41") */
function getWikipediaSeasonTitle(seasonNum) {
  const name = SEASON_TO_FANDOM_NAME[seasonNum];
  if (!name) return null;
  if (seasonNum >= 41) return 'Survivor ' + seasonNum;
  return 'Survivor: ' + name;
}

/** Fetch Wikipedia season page wikitext */
async function getWikipediaSeasonWikitext(seasonNum) {
  const title = getWikipediaSeasonTitle(seasonNum);
  if (!title) return null;
  const url = `${WIKIPEDIA_API}?action=query&titles=${encodeURIComponent(title)}&prop=revisions&rvprop=content&rvslots=*&format=json&origin=*`;
  const body = await get(url);
  const data = JSON.parse(body);
  const pages = data.query?.pages || {};
  const page = Object.values(pages)[0];
  if (!page || page.missing) return null;
  const rev = page.revisions?.[0];
  const slot = rev?.slots?.main ?? rev;
  const content = slot?.content ?? slot?.['*'];
  return content || null;
}

/** Normalize name for matching: strip nickname in quotes, collapse spaces, lowercase */
function normalizeNameForMatch(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/\s*"[^"]*"\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Return multiple key variants so "Bill \"B.B.\" Andersen" can match wiki "B.B. Andersen".
 * Strips trailing parentheticals (e.g. "Richard Hatch (Survivor contestant)").
 */
function getMatchKeys(name) {
  if (!name || typeof name !== 'string') return [];
  const clean = (s) => s.replace(/\s*\([^)]*\)\s*$/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const keys = new Set();
  const stripQuotes = (s) => s.replace(/\s*"[^"]*"\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const withQuotes = (s) => s.replace(/\s*"([^"]*)"\s*/g, ' $1 ').replace(/\s+/g, ' ').trim();
  const lastFirst = (s) => {
    const parts = s.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return s;
    const last = parts.pop();
    return (last + ' ' + parts.join(' ')).toLowerCase();
  };
  const n1 = clean(stripQuotes(name));
  if (n1) {
    keys.add(n1);
    keys.add(lastFirst(n1));
  }
  const n2 = clean(withQuotes(name));
  if (n2) {
    keys.add(n2);
    keys.add(lastFirst(n2));
    const n2NoDots = n2.replace(/\./g, '');
    if (n2NoDots) {
      keys.add(n2NoDots);
      keys.add(lastFirst(n2NoDots));
    }
  }
  const quoted = name.match(/\s*"([^"]+)"\s*/);
  if (quoted) {
    const nick = quoted[1].replace(/\s+/g, ' ').trim().toLowerCase();
    const rest = stripQuotes(name.replace(/\s*"[^"]*"\s*/, ' '));
    const parts = rest.trim().split(/\s+/).filter(Boolean);
    const lastPart = parts.length ? parts[parts.length - 1].toLowerCase() : '';
    if (lastPart && nick) {
      keys.add(nick + ' ' + lastPart);
      keys.add(lastPart + ' ' + nick);
      const nickNoDots = nick.replace(/\./g, '');
      if (nickNoDots) {
        keys.add(nickNoDots + ' ' + lastPart);
        keys.add(lastPart + ' ' + nickNoDots);
      }
    }
  }
  return [...keys].filter(Boolean);
}

/**
 * Parse Wikipedia season page contestants table. Returns array of { name, age, tribe }.
 * Name is extracted from {{sortname|First|Last}} or [[Name]]; tribe from {{stribe|X}} (use as initial tribe; skip if merge tribe).
 */
function parseWikipediaContestantsTable(wikitext) {
  const entries = [];
  if (!wikitext) return entries;
  const contestantsSection = wikitext.indexOf('==Contestants==');
  if (contestantsSection === -1) return entries;
  const slice = wikitext.slice(contestantsSection, contestantsSection + 35000);
  const rowRegex = /\|\s*-\s*\n\s*!\s*scope="row"[^|]*\|\s*([^|\n]+?)\s*\n\|\s*(\d+)\s*\n\|\s*[^|\n]+\s*\n\|\s*(?:rowspan="[^"]*"\s+)?(?:{{stribe\|([^}|]+)}}|)/g;
  let m;
  const sortnameRegex = /\{\{sortname\|([^|]+)\|([^|]+)(?:\|[^}]*)?\}\}/i;
  const linkRegex = /\[\[(?:[^|\]]+\|)?([^|\]]+)\]\]/;
  while ((m = rowRegex.exec(slice)) !== null) {
    const rawName = m[1].trim();
    const age = parseInt(m[2], 10);
    let tribe = m[4] ? m[4].trim() : null;
    let name = rawName;
    const sortM = rawName.match(sortnameRegex);
    if (sortM) {
      name = (sortM[1] + ' ' + sortM[2]).trim();
    } else {
      const linkM = rawName.match(linkRegex);
      if (linkM) name = linkM[1].trim();
    }
    if (name && !/^(?:scope|rowspan|colspan|style=)/i.test(name)) {
      entries.push({
        name: name.trim(),
        age: isNaN(age) ? null : age,
        tribe: tribe && tribe.toLowerCase() !== 'rattana' ? tribe : null,
      });
    }
  }
  if (entries.length === 0) {
    const altRowRegex = /\|\s*-\s*\n\s*!\s*[^|]*\|\s*[^|\n]*\{\{sortname\|([^|]+)\|([^|]+)/g;
    while ((m = altRowRegex.exec(slice)) !== null) {
      const name = (m[1] + ' ' + m[2]).trim();
      const after = slice.slice(m.index, m.index + 500);
      const ageM = after.match(/\|\s*(\d+)\s*\n/);
      const tribeM = after.match(/\{\{stribe\|([^}|]+)\}\}/);
      entries.push({
        name,
        age: ageM ? parseInt(ageM[1], 10) : null,
        tribe: tribeM && tribeM[1].toLowerCase() !== 'rattana' ? tribeM[1].trim() : null,
      });
    }
  }
  return entries;
}

/** Extract tribe for a season from wikitext: find ===SeasonName=== then "Assigned on the [[X]] tribe" or "[[X]] tribe" */
function extractTribe(wikitext, seasonNum) {
  const seasonName = SEASON_TO_FANDOM_NAME[seasonNum];
  if (!seasonName || !wikitext) return null;
  const sectionHeader = `===${seasonName}===`;
  let start = wikitext.indexOf(sectionHeader);
  if (start === -1) {
    const alt = `===Survivor: ${seasonName}===`;
    start = wikitext.indexOf(alt);
    if (start === -1) return null;
    start += alt.length;
  } else {
    start += sectionHeader.length;
  }
  const nextSection = wikitext.indexOf('\n===', start);
  const section = nextSection === -1 ? wikitext.slice(start, start + 4000) : wikitext.slice(start, nextSection);
  const assigned = section.match(/Assigned\s+on\s+the\s+\[\[([^\]|]+)/i);
  if (assigned) return assigned[1].trim();
  const started = section.match(/(?:Started|placed)\s+on\s+the\s+\[\[([^\]|]+)/i);
  if (started) return started[1].trim();
  const hisTribe = section.match(/(?:his|her)\s+\[\[([^\]|]+)\]\]\s+tribe/i);
  if (hisTribe) return hisTribe[1].trim();
  const mergeIdx = section.search(/\b(?:merge|merged)\b/i);
  const beforeMerge = mergeIdx === -1 ? section : section.slice(0, mergeIdx);
  const theTribe = beforeMerge.match(/the\s+\[\[([^\]|]+)\]\]\s+tribe/i);
  if (theTribe) return theTribe[1].trim();
  const m = beforeMerge.match(/\[\[([^\]|]+)\]\]\s+tribe,?\s+\w+/i);
  if (m) return m[1].trim();
  return null;
}

/** Extract age for a season from Contestant template (Borneo= ... |-|All-Stars= ...). Quotes not used. */
function extractAgeFromFandom(wikitext, seasonNum) {
  const seasonName = SEASON_TO_FANDOM_NAME[seasonNum];
  if (!seasonName || !wikitext) return null;
  const needle = seasonName + '=';
  const startIdx = wikitext.indexOf(needle);
  if (startIdx === -1) return null;
  const blockStart = startIdx + needle.length;
  const nextBlock = wikitext.indexOf('\n|-|', blockStart);
  const block = nextBlock === -1 ? wikitext.slice(blockStart, blockStart + 3500) : wikitext.slice(blockStart, nextBlock);
  const ageM = block.match(/'''Age:'''\s*(\d+)/);
  return ageM ? parseInt(ageM[1], 10) : null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const missingOnly = args.includes('--missing-only');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;
  const seasonIdx = args.indexOf('--season');
  const filterSeason = seasonIdx >= 0 && args[seasonIdx + 1] ? parseInt(args[seasonIdx + 1], 10) : null;
  const idsIdx = args.indexOf('--ids');
  const filterIds = idsIdx >= 0 && args[idsIdx + 1] ? new Set(args[idsIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)) : null;

  if (!fs.existsSync(CARDS_PATH)) {
    console.error('Cards file not found:', CARDS_PATH);
    process.exit(1);
  }

  const cards = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));
  let toProcess = cards.filter((c) => c.season != null);
  if (filterSeason != null) toProcess = toProcess.filter((c) => c.season === filterSeason);
  if (filterIds != null) toProcess = toProcess.filter((c) => filterIds.has(c.id));
  if (missingOnly) {
    toProcess = toProcess.filter((c) => !(c.tribe && c.tribe.trim()) || c.age == null);
  }
  if (limit) toProcess = toProcess.slice(0, limit);

  const wikipediaOnly = args.includes('--wikipedia-only');
  console.log(
    `Fetching tribe, age from ${wikipediaOnly ? 'Wikipedia' : 'Fandom + Wikipedia'} for ${toProcess.length} cards` +
      (missingOnly ? ' (missing-only)' : '') +
      (filterSeason != null ? ` (season ${filterSeason})` : '') +
      (filterIds != null ? ` (ids: ${[...filterIds].join(', ')})` : '') +
      (limit ? ` (limit ${limit})` : '') +
      (dryRun ? ' [dry-run]' : '') +
      '\n'
  );

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  let updated = 0;
  let failed = 0;
  const contentCache = new Map();

  if (!wikipediaOnly) {
    for (let i = 0; i < toProcess.length; i++) {
      const card = toProcess[i];
      const slug = slugFromCard(card);
      const season = card.season;

      try {
        let wikitext = contentCache.get(slug);
        if (wikitext === undefined) {
          wikitext = await getWikiContent(slug);
          contentCache.set(slug, wikitext);
          await delay(400);
        }
        if (!wikitext && card.name) {
          const nameSlug = slugFromName(card.name);
          if (nameSlug && nameSlug !== slug) {
            wikitext = contentCache.get(nameSlug);
            if (wikitext === undefined) {
              wikitext = await getWikiContent(nameSlug);
              contentCache.set(nameSlug, wikitext);
              await delay(400);
            }
            if (wikitext) contentCache.set(slug, wikitext);
          }
        }
        if (!wikitext) {
          console.warn(`  [skip] No page: ${card.name} (s${season}) → ${slug}`);
          failed++;
          continue;
        }

        const tribe = extractTribe(wikitext, season);
        const age = extractAgeFromFandom(wikitext, season);
        if (tribe != null && tribe !== (card.tribe || '')) {
          card.tribe = tribe;
          updated++;
        }
        if (age != null && card.age !== age) {
          card.age = age;
          updated++;
        }
        const parts = [];
        if (tribe != null) parts.push(`tribe=${tribe}`);
        if (age != null) parts.push(`age=${age}`);
        console.log(
          (dryRun && (tribe != null || age != null) ? '[dry-run] ' : '') +
            (tribe != null || age != null ? 'OK ' : '-- ') +
            card.name +
            ' (s' + season + ')' +
            (parts.length ? ' ' + parts.join(' ') : '')
        );
      } catch (err) {
        console.warn(`  FAIL ${card.name} (s${season}) ${slug}: ${err.message}`);
        failed++;
      }
    }
  }

  console.log('\n--- Wikipedia season pages ---');
  const seasonsNeeded = [...new Set(toProcess.filter((c) => !(c.tribe && c.tribe.trim()) || c.age == null).map((c) => c.season))].filter(Boolean).sort((a, b) => a - b);
  const wpCache = new Map();
  for (const seasonNum of seasonsNeeded) {
    let wikitext = wpCache.get(seasonNum);
    if (wikitext === undefined) {
      wikitext = await getWikipediaSeasonWikitext(seasonNum);
      wpCache.set(seasonNum, wikitext);
      await delay(500);
    }
    if (!wikitext) {
      console.warn(`  [skip] No Wikipedia page for season ${seasonNum}`);
      continue;
    }
    const tableEntries = parseWikipediaContestantsTable(wikitext);
    const byKey = new Map();
    tableEntries.forEach((e) => {
      getMatchKeys(e.name).forEach((key) => {
        if (key && !byKey.has(key)) byKey.set(key, e);
      });
    });
    const lastNameToEntry = new Map();
    const lastFirstInitialToEntry = new Map();
    tableEntries.forEach((e) => {
      const parts = e.name.trim().split(/\s+/).filter(Boolean);
      const last = parts.length ? parts[parts.length - 1].toLowerCase() : '';
      const firstInitial = parts.length ? (parts[0][0] || '').toLowerCase() : '';
      if (last) {
        if (!lastNameToEntry.has(last)) lastNameToEntry.set(last, []);
        lastNameToEntry.get(last).push(e);
        const liKey = last + ' ' + firstInitial;
        if (firstInitial && !lastFirstInitialToEntry.has(liKey)) lastFirstInitialToEntry.set(liKey, e);
      }
    });
    const firstLastToEntry = new Map();
    tableEntries.forEach((e) => {
      const parts = e.name.trim().split(/\s+/).filter(Boolean);
      const first = parts.length ? parts[0].toLowerCase() : '';
      const last = parts.length ? parts[parts.length - 1].toLowerCase() : '';
      if (first && last) {
        const key = first + '\t' + last;
        if (!firstLastToEntry.has(key)) firstLastToEntry.set(key, e);
      }
    });
    const cardsThisSeason = toProcess.filter((c) => c.season === seasonNum);
    for (const card of cardsThisSeason) {
      if (card.tribe && card.tribe.trim() && card.age != null) continue;
      let entry = null;
      for (const key of getMatchKeys(card.name)) {
        entry = byKey.get(key);
        if (entry) break;
      }
      const cardParts = card.name.replace(/\s*"[^"]*"\s*/g, ' ').trim().split(/\s+/).filter(Boolean);
      const cardLast = cardParts.length ? cardParts[cardParts.length - 1].toLowerCase() : '';
      const cardFirstInitial = cardParts.length ? (cardParts[0][0] || '').toLowerCase() : '';
      if (!entry) {
        const candidates = cardLast ? lastNameToEntry.get(cardLast) : null;
        if (candidates && candidates.length === 1) entry = candidates[0];
        if (!entry && cardLast && cardFirstInitial) entry = lastFirstInitialToEntry.get(cardLast + ' ' + cardFirstInitial) || null;
      }
      if (!entry && cardParts.length >= 2) {
        const cardFirst = cardParts[0].toLowerCase();
        entry = firstLastToEntry.get(cardFirst + '\t' + cardLast) || null;
      }
      if (!entry) continue;
      let changed = false;
      if ((!card.tribe || !card.tribe.trim()) && entry.tribe) {
        card.tribe = entry.tribe.charAt(0).toUpperCase() + entry.tribe.slice(1).toLowerCase();
        changed = true;
        updated++;
      }
      if ((card.age == null || card.age === '') && entry.age != null) {
        card.age = entry.age;
        changed = true;
        updated++;
      }
      if (changed) {
        console.log('  OK (WP) ' + card.name + ' (s' + seasonNum + ')' + (entry.tribe ? ' tribe=' + entry.tribe : '') + (entry.age != null ? ' age=' + entry.age : ''));
      }
    }
  }

  let filledPlaceholder = 0;
  const hadQuotes = cards.some((c) => c.hasOwnProperty('quote'));
  if (!dryRun) {
    cards.forEach((c) => {
      if (c.season != null && (!c.tribe || !String(c.tribe).trim())) {
        c.tribe = '?';
        filledPlaceholder++;
      }
      if (c.season != null && (c.age == null || c.age === '')) c.age = null;
      if (c.hasOwnProperty('quote')) delete c.quote;
    });
  }

  console.log('\nDone. Updated: ' + updated + ', Failed: ' + failed + (filledPlaceholder > 0 ? ', Placeholder tribe: ' + filledPlaceholder : ''));
  if (!dryRun && (updated > 0 || hadQuotes || filledPlaceholder > 0)) {
    fs.writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2), 'utf8');
    console.log('Written: ' + CARDS_PATH + (hadQuotes ? ' (quotes removed from all cards)' : ''));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
