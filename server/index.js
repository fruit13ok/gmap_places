// REQUIREMENTS

// native
const path = require('path');

// 3rd party
const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const fetch = require("node-fetch");

// local
const app = express();
const port = process.env.PORT || 8000;

// MIDDLEWARE
app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(__dirname + '../node_modules/bootstrap/dist/css'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// allow cors to access this backend
app.use( (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// INIT SERVER
app.listen(port, () => {
    console.log(`Started on port ${port}`);
});

// helper functions
const forLoop = async (resultElements) => {
    // var tempArr=[];
    // for (let resultElement of resultElements) {
    //     let url = await (await resultElement.getProperty('href')).jsonValue();
    //     let aText = await resultElement.$eval('h3', i => i.innerText);
    //     console.log(url);
    //     console.log(aText);
    //     // urls.push(url);
    //     tempArr.push({url: url, aText: aText});
    // }
    // return tempArr;
    return resultElements[0];
}

const consoleLog = async (obj) => {
    console.log("testing");
    console.log(obj);
    return obj;
}

// scrape
async function scrape (searchKey) {
    // const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});   // need for real server
    const browser = await puppeteer.launch({headless: false, slowMo: 100});
    // const browser = await puppeteer.launch({slowMo: 100}); // need to slow down to content load

    const page = await browser.newPage();
    // deal with navigation and page timeout, see the link
    // https://www.checklyhq.com/docs/browser-checks/timeouts/
    const navigationPromise =  page.waitForNavigation();
    
    await page.goto('https://www.google.com/maps/');
    await navigationPromise;
    await page.type('input#searchboxinput', searchKey, { delay: 50 });
    // await page.type('input[title="Search"]', searchKey);
    await page.keyboard.press('Enter');
    await navigationPromise;

    // await page.waitForSelector('a#hdtb-tls');
    // await page.waitForSelector('div[jstcache="969"]');
    // await page.waitForSelector('.section-result-content');
    let urls = [];
    // await page.evaluate(() => { document.querySelectorAll('.section-result-content button')[0].click(); });
    // await page.$$eval('.section-result-content button', elements => elements[0].click());
    // const arrOfElements = await page.evaluate(() => { document.querySelectorAll('.section-result-content button')[0]; });
    // const arrOfElements = await page.evaluate(() => { document.querySelectorAll('a[jstcache="856"]:not([class]')[1].click(); });
    await page.waitForSelector('div.section-result-content');
    // await page.$eval('.section-result-content', elements => page.click(elements[1])); 
    // await page.click(arrOfElements);

    const arrOfElements = await page.$$('div.section-result-content');
    const arrObj = await forLoop(arrOfElements)
    // await page.click('a#hdtb-tls');
    // await page.click('div[jstcache="969"]');
    // await page.click('div.section-result-content');
    await arrObj.click();

    await navigationPromise;

    await page.waitForSelector('.section-hero-header-image-hero-container.collapsible-hero-image img');
    const imageUrl = await page.$eval('.section-hero-header-image-hero-container.collapsible-hero-image img', img => img.src);

    await page.waitForSelector('.ugiz4pqJLAG__primary-text.gm2-body-2');
    const divTexts = await page.$$eval('.ugiz4pqJLAG__primary-text.gm2-body-2', divs => divs.map(div => div.innerText));
    
    let [address, city, stateZip] = divTexts[0].split(', ');
    let [state, zip] = stateZip.split(' ');
    let phoneNumber = divTexts[2];
    let website = divTexts[1];
    // console.log(imageUrl);
    // console.log(address);
    // console.log(city);
    // console.log(state);
    // console.log(zip);
    // console.log(phoneNumber);
    // console.log(website);
    urls.push({imageUrl: imageUrl, address: address, city: city, state: state, zip: zip, phoneNumber: phoneNumber, website: website});

    await page.goBack();


    ////////////////////////// list of results on current page ////////////////////////////

    // var searchKey = "san francisco japanese market";
    // var searchKey = "san francisco marketing firm";
    // var ariaLabel="Results for "+searchKey;
    // // array of elements contain current page results
    // var elements = document.querySelectorAll(`div.section-layout.section-scrollbox.scrollable-y.scrollable-show.section-layout-flex-vertical [aria-label="${ariaLabel}"]`);
    // // array of current page results
    // elements[0].querySelectorAll('.sJKr7qpXOXd__result-container.sJKr7qpXOXd__two-actions.sJKr7qpXOXd__wide-margin');

    // await browser.close();
    return urls;
};

// ROUTES
// root
app.get('/', function (req, res) {
    res.send('hello world');
});

// post, get form data from frontend
// return array of object with searchKey and count to frontend
app.post('/api', async function (req, res) {
    req.setTimeout(0);
    let searchKey = req.body.searchKey || "";

    const companies = await scrape(searchKey);

    console.log("result", companies);
    let rlist = [{key: searchKey, value: companies}];
    res.status(200).send(rlist);
});