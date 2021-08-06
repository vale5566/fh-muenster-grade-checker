const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const CronJob = require('cron').CronJob;
const config = require('./config.json');
const Discord = require("discord.js");
const client = new Discord.Client();

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

if (config.id === undefined || config.password === undefined) {
    console.error('Ensure a config.json file exists with id and password properties.');
    process.exit();
}

if (typeof (config.id) !== 'string' || typeof (config.password) !== 'string') {
    console.error('Ensure config.json id and password properties are strings.');
    process.exit();
}

async function configureBrowser() {
    const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    return page;
}

async function getNewestMessage(page) {
    await page.goto('https://www.fh-muenster.de/myfh', { waitUntil: 'networkidle2' });
    await page.type('#username', config.id);
    await page.type('#password', config.password);
    await page.click('.login-button', { waitUntil: 'networkidle2' });

    await page.goto('https://www.fh-muenster.de/sso.php?filename=/myfh&lang=DE');
    await page.goto('https://www.fh-muenster.de/myfh/meine-nachrichten.php'), { waitUntil: 'networkidle2' };
    await delay(3000);

    let $ = cheerio.load(await page.content());
    let message = $('.textcutt').first();
    return message.text().replace(/  +/g, '').replace(/(\r\n|\n|\r)/gm, "");
}

async function startTracking() {
    let page = await configureBrowser();
    let message = await getNewestMessage(page);
    //client.channels.cache.get('764064335600812056').send('Hello here!');

    let tempMessage;

    //runs every 30 minutes in this config
    let job = new CronJob('* */30 * * * *', function () {
        tempMessage = getNewestMessage(page);
        if (message != tempMessage) {
            message = tempMessage;
            client.channels.cache.get('764064335600812056').send(message);
        }
    }, null, true, null, null, true);
    job.start();
}

client.login(config.BOT_TOKEN);
startTracking();

