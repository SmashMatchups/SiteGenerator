const fs = require('fs');
const md = require('markdown-it')();
const cliProgress = require('cli-progress');
const nunjucks = require('nunjucks');
const clone = require('git-clone');
var fsExtra = require('fs-extra');
var path = require('path');
const args = require('minimist')(process.argv.slice(2));
const local = !!args['local']
const localPath = local ? "local" : "output";
const cheerio = require('cheerio');


fs.mkdirSync(localPath,{recursive: true});
console.log("Building site to './" + localPath + "'");

const characters = ["Banjo & Kazooie","Bayonetta","Bowser Jr.","Bowser","Byleth","Captain Falcon","Charizard","Chrom","Cloud","Corrin","Daisy","Dark Pit","Dark Samus","Diddy Kong","Donkey Kong","Dr.Mario","Duck Hunt","Falco","Fox","Ganondorf","Greninja","Hero","Ice Climbers","Ike","Incineroar","Inkling","Isabelle","Ivysaur","Jigglypuff","Joker","Ken","King Dedede","King K.Rool","Kirby","Link","Little Mac","Lucario","Lucas","Lucina","Luigi","Mario","Marth","Mega Man","Meta Knight","Mewtwo","Mii Brawler","Mii Gunner","Mii Swordfighter","Min Min","Mr.Game & Watch","Ness","Olimar","Pac - Man","Palutena","Peach","Pichu","Pikachu","Piranha Plant","Pit","ROB","Richter","Ridley","Robin","Rosalina & Luma","Roy","Ryu","Samus","Sephiroth","Sheik","Shulk","Simon","Snake","Sonic","Squirtle","Steve","Terry","Toon Link","Villager","Wario","Wii Fit Trainer","Wolf","Yoshi","Young Link","Zelda","Zero Suit Samus"
];

const encode = string => string.replace(/\./g," ").trim().replace(/ /g,"_").replace('&','and').replace(/\-/g,"").replace('__','_').toLowerCase();
const charMap = characters.map(
  fullName => ({
    urlName: encode(fullName),
    fullName
  }));

const template = nunjucks.compile(fs.readFileSync("index.njk").toString());

const writeTemplate = (data) => {
  const char1Name = data.char1 ? data.char1.urlName : 'anyone';
  const char2Name = data.char2 ? data.char2.urlName : 'anyone';
  const path = `${localPath}/${char1Name}-vs-${char2Name}`;
  const output = template.render({
    charMap,
    local,
    ...data
  });
  fs.writeFileSync(path + (local ? ".html" : ""),output)
}

const renderMarkdown = (content) => {
  const domString = md.render(content);
  if (!domString) return '';
  const doc = cheerio.load(domString);
  const result = cheerio.load("<div id='content'></div>");
  doc('body > *').toArray().forEach(ele => {
    if (ele.name == 'h2') result('#content').append("<section></section>")
    if (result('#content').children().length > 0)
      result('#content section').last().append(ele);
  });
  return result('#content').html();
}

console.log("Generating matchup files...")
const progress = new cliProgress.SingleBar({},cliProgress.Presets.shades_classic);
progress.start(charMap.length * charMap.length,0,{
  currentFile: 'N/A'
});

// For every combonation of characters
charMap.forEach(char1 => {
  charMap.forEach(char2 => {
    progress.increment(1);
    const matchupFile = `matchups/${char1.urlName}/${char2.urlName}.md`;
    const fallBackFile = `matchups/${char2.urlName}/how_to_beat.md`;
    let content = '';
    let isGenericContent = false;
    if (fs.existsSync(matchupFile)) content = fs.readFileSync(matchupFile).toString();
    else if (fs.existsSync(fallBackFile)) {
      content = fs.readFileSync(fallBackFile).toString();
      isGenericContent = true;
    }
    content = renderMarkdown(content);
    const data = {
      hasMatchupContent: !!content,
      matchupContent: content,
      isGenericContent,
      char1,
      char2,
      isHomepage: false,
      githubLinkCreate: `https://github.com/SmashMatchups/SSBU-Matchups/new/main/matchups/${char1.urlName}/${char2.urlName}?filename=${char2.urlName}.md&value=%23%20${encodeURIComponent(char1.fullName)}%20vs%20${encodeURIComponent(char2.fullName)}`,
      githubLinkEdit: `https://github.com/SmashMatchups/SSBU-Matchups/edit/main/matchups/${char1.urlName}/${char2.urlName}.md`,
      githubGenericEdit: `https://github.com/SmashMatchups/SSBU-Matchups/edit/main/matchups/${char2.urlName}/how_to_beat.md`,
    }
    writeTemplate(data);
  });
  // Add the anyone-vs-char and char-vs-anyone files
  writeTemplate({
    char1: undefined,
    char2: char1,
    playerOne: undefined,
    playerTwo: char1,
    isHomepage: true,
  });
  writeTemplate({
    char1,
    char2: undefined,
    playerOne: char1,
    playerTwo: undefined,
    isHomepage: true,
  });
});

// Also add our assets output folder
fs.writeFileSync(localPath + '/index.html',template.render({local,isHomepage: true,charMap}))
var sourceDir = './assets';
var destDir = './' + localPath;

// if folder doesn't exists create it
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir,{recursive: true});
}

//copy directory content including subfolders
fsExtra.copy(sourceDir,destDir,function (err) {
  if (err) {
    console.error(err);
  } else {
    console.log("success!");
  }
});

progress.stop();
