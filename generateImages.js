/** Generates images for every matchup */
const fs = require('fs');
const { createCanvas } = require('canvas')

fs.mkdirSync("matchupImages",{recursive: true});

/** @type {{urlName:string,fullName:string}[]} */
let characters = JSON.parse(fs.readFileSync('./characters.json'));
characters = characters.slice(0,2);

const width = 500;
const height = 300;

const canvas = createCanvas(width, height);
const context = canvas.getContext('2d');

characters.forEach(char1 => 
characters.forEach(char2 => {
    context.fillStyle = "black";
    context.fillRect(0,0,width,height);
    context.fillStyle = 'grey'
    context.fillRect(1,1,248,240);
    context.fillRect(251,1,248,240);



    context.font = "32px Roboto"
    context.textAlign = 'center';
    context.fillStyle = 'white';
    context.fillText(char1.fullName.toUpperCase(), 125, 286);
    context.fillText(char2.fullName.toUpperCase(), 375, 286);
    const buffer = canvas.toBuffer('image/png')
    fs.writeFileSync(`./matchupImages/${char1.urlName}-vs-${char2.urlName}.png`, buffer)
}));
