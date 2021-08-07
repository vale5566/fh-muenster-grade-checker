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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36');
    return page;
}

async function login(page) {
    await page.goto('https://www.fh-muenster.de/myfh', { waitUntil: 'networkidle0' });
    await page.type('#username', config.id);
    await page.type('#password', config.password);
    await page.click('.login-button', { waitUntil: 'networkidle0' });
    await delay(3000);
    await page.goto('https://www.fh-muenster.de/myfh/meine-nachrichten.php');
}

async function getNewestMessage(page) {
    await page.setJavaScriptEnabled(false);
    await page.reload();
    await delay(3000);
    let $ = cheerio.load(await page.content());
    let message = $('.textcutt').first();
    let res = message.text().replace(/  +/g, '').replace(/(\r\n|\n|\r)/gm, "");
    //console.log(res);
    return res;
}

async function checkGrades(page, message) {
    let tempMessage;
    tempMessage = await getNewestMessage(page);
    if (message != tempMessage && tempMessage) {
        message = tempMessage;
        client.channels.cache.get('764064335600812056').send(message);
    }
}

async function startTracking() {
    let page = await configureBrowser();
    await login(page);
    let message = await getNewestMessage(page);
    //client.channels.cache.get('764064335600812056').send('Hello here!');

    //runs every 30 minutes in this config
    let job = new CronJob('*/30 * * * *', function () {
        checkGrades(page, message);
    }, null, true, null, null, true);
    job.start();
}

client.login(config.BOT_TOKEN);
startTracking();

