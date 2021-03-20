const fs = require('fs');
const md = require('markdown-it')();
const nunjucks = require('nunjucks');
const cheerio = require('cheerio');

const args = require('minimist')(process.argv.slice(2));
const local = !!args['local']
const localPath = local ? "local" : "output";

fs.mkdirSync(localPath,{recursive: true});
console.log("Building site to './" + localPath + "'");

/** @type {{urlName:string,fullName:string}[]} */
let characters = JSON.parse(fs.readFileSync('./characters.json'));
if (local) characters = characters.slice(0,5);

const template = nunjucks.compile(fs.readFileSync("index.njk").toString());

const writeTemplate = (data) => {
  const path = `${localPath}/${data.char1.urlName}-vs-${data.char2.urlName}`;
  const canonicalLink = `https://www.smashmatchups.com/${data.char1.urlName}-vs-${data.char2.urlName}`;
  const output = template.render({
    characters,
    local,
    canonicalLink,
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

// For every combonation of characters
characters.forEach(char1 => {
  characters.forEach(char2 => {
    const matchupFile = `matchups/${char1.urlName}/${char2.urlName}.md`;
    const fallBackFile = `matchups/${char2.urlName}/how_to_beat.md`;
    let content = '';
    let isGenericContent = false;
    if (fs.existsSync(matchupFile)) content = fs.readFileSync(matchupFile).toString();
    else if (fs.existsSync(fallBackFile)) {
      content = fs.readFileSync(fallBackFile).toString();
      isGenericContent = !char1.isAnyone;
    }
    content = renderMarkdown(content);
    const data = {
      hasMatchupContent: !!content,
      matchupContent: content,
      isGenericContent,
      char1,
      char2,
      githubLinkCreate: `https://github.com/SmashMatchups/SSBU-Matchups/new/main/matchups/${char1.urlName}/${char2.urlName}?filename=${char2.urlName}.md&value=%23%20${encodeURIComponent(char1.fullName)}%20vs%20${encodeURIComponent(char2.fullName)}`,
      githubLinkEdit: `https://github.com/SmashMatchups/SSBU-Matchups/edit/main/matchups/${char1.urlName}/${char2.urlName}.md`,
      githubGenericEdit: `https://github.com/SmashMatchups/SSBU-Matchups/edit/main/matchups/${char2.urlName}/how_to_beat.md`,
    }
    writeTemplate(data);
  });
});

// Also add our homepage
fs.writeFileSync(localPath + '/index.html',template.render({local,isHomepage: true,characters,canonicalLink: "https://www.smashmatchups.com/"}))

let siteMapText = "https://www.smashmatchups.com/";
console.log("Creating sitemap");
characters.forEach(char1 => {
  characters.forEach(char2 => {
    siteMapText += "\nhttps://www.smashmatchups.com/" + char1.urlName + "-vs-" + char2.urlName;
  });
});
fs.writeFileSync(localPath + "/sitemap.txt",siteMapText);

