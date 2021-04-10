const fs = require('fs');
const md = require('markdown-it')();
const nunjucks = require('nunjucks');
const cheerio = require('cheerio');
const gitDateExtractor = require('git-date-extractor');

const stamps = gitDateExtractor.getStamps({onlyIn: "matchups"});
const args = require('minimist')(process.argv.slice(2));
const local = !!args['local']
const localPath = local ? "local" : "output";
const fileName = local ? ".html" : "";

fs.mkdirSync(localPath,{recursive: true});
console.log("Building site to './" + localPath + "'");

/** @type {{urlName:string,fullName:string}[]} */
let characters = JSON.parse(fs.readFileSync('./characters.json'));
if (local) characters = characters.slice(0,3);

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
  fs.writeFileSync(path + fileName,output);
}

/** @param {cheerio.Root} root  */
function addMicroData(root) {
  root('#content section').toArray().forEach(section => {
    section.attribs.itemprop = 'step';
    section.attribs.itemtype = "http://schema.org/HowToStep";
    section.attribs.itemscope = '';
  });
  root('#content h2').toArray().forEach(h2 => h2.attribs['itemprop'] = 'name')
  root('#content li').toArray().forEach(ul => {
    ul.attribs['itemprop'] = 'itemListElement';
    ul.attribs['itemscope'] = '';
    ul.attribs['itemtype'] = "http://schema.org/HowToDirection";
  });
  
  root('li').wrapInner('<span itemprop="text"></span>');
  //root('#content li').toArray().forEach(li => li.attribs['itemprop'] = 'text')
  return root;
}

// section itemprop="step" itemscope itemtype="http://schema.org/HowToStep"
// h2  ele.attribs['itemprop'] = 'name';
// ul ele.attribs['itemprop']="itemListElement";
// li itemprop = text
const renderMarkdown = (content) => {
  const domString = md.render(content);
  if (!domString) return '';
  const doc = cheerio.load(domString);
  const result = cheerio.load("<div id='content'></div>");
  doc('body > *').toArray().forEach(ele => {
    if (ele.name == 'h2') result('#content').append(`<section></section>`);
    if (result('#content').children().length > 0)
      result('#content section').last().append(ele);
  });
  doc('#content li').toArray().forEach(ul => {
    ul.attribs['itemprop'] = 'itemListElement';
    ul.attribs['itemscope'] = '';
    ul.attribs['itemtype'] = "http://schema.org/HowToDirection";
  });
  return addMicroData(result)('#content').html();
}

console.log("Generating matchup files...")



// For every combonation of characters
characters.forEach(char1 => {
  characters.forEach(async char2 => {
    const matchupFile = `matchups/${char1.urlName}/${char2.urlName}.md`;
    const fallBackFile = `matchups/${char2.urlName}/how_to_beat.md`;
    let content = '';
    let lastModified;
    let isGenericContent = false;
    if (fs.existsSync(matchupFile)) {
      content = fs.readFileSync(matchupFile).toString();
      lastModified = new Date((await stamps)[matchupFile].modified * 1000);
    }
    else if (fs.existsSync(fallBackFile)) {
      content = fs.readFileSync(fallBackFile).toString();
      lastModified = new Date((await stamps)[fallBackFile].modified * 1000);
      isGenericContent = !char1.isAnyone;
    }
    content = renderMarkdown(content);
    const data = {
      hasMatchupContent: !!content,
      matchupContent: content,
      isGenericContent,
      lastModified: lastModified ? lastModified.toISOString().split('T')[0] : false,
      isHomepage: char1.isAnyone && char2.isAnyone,
      char1,
      char2,
      githubLinkCreate: `https://github.com/SmashMatchups/SSBU-Matchups/new/main/matchups/${char1.urlName}/${char2.urlName}?filename=${char2.urlName}.md&value=%23%20${encodeURIComponent(char1.fullName)}%20vs%20${encodeURIComponent(char2.fullName)}`,
      githubLinkEdit: `https://github.com/SmashMatchups/SSBU-Matchups/edit/main/matchups/${char1.urlName}/${char2.urlName}.md`,
      githubGenericEdit: `https://github.com/SmashMatchups/SSBU-Matchups/edit/main/matchups/${char2.urlName}/how_to_beat.md`,
    }
    writeTemplate(data);
  });
});

// Rename our anyone-vs-anyone to homepage
fs.copyFileSync(`${localPath}/anyone-vs-anyone${fileName}`,`${localPath}/index.html`);

let siteMapText = "https://www.smashmatchups.com/";
console.log("Creating sitemap");
characters.forEach(char1 => {
  characters.forEach(char2 => {
    siteMapText += "\nhttps://www.smashmatchups.com/" + char1.urlName + "-vs-" + char2.urlName;
  });
});
fs.writeFileSync(localPath + "/sitemap.txt",siteMapText);

