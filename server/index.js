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
const forLoop = async (resultElements, myPage) => {
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
    // for (let resultElement of resultElements){

    // }
    // const navigationPromise =  myPage.waitForNavigation();
    // await resultElements[0].click();
    // await navigationPromise;
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

    let urls = [];

    // *** NOTE *** sometime the class name won't be 'div.section-result-content'
    // it can be '.section-place-result-container-summary button'
    // that might be a way google counter scraping, I don't know how to work around it yet
    // document.querySelectorAll('div.section-result-content h3')[0].innerText
    ////////// no use selecting 'a' tag, it is not clickable
    // document.querySelectorAll('a[style*="display: none;"]')
    // document.querySelectorAll('a[style*="display:none"]')

    // go to back to result page don't use await page.goBack();
    // instead select the back button and click it

    // *** NOTE *** Error: Node is detached from document
    // one solution is to evaluate the same selector every time the page navigate.

    await page.waitForSelector('div.section-result-content'); 
    var arrOfElements = await page.$$('div.section-result-content');

    // #pane > div > div.widget-pane-content.scrollable-y > div > div > div.section-layout.section-scrollbox.scrollable-y.scrollable-show.section-layout-flex-vertical > div.section-layout.section-scrollbox.scrollable-y.scrollable-show.section-layout-flex-vertical > div:nth-child(1) > div:nth-child(5)
    // document.querySelectorAll('#pane > div > div.widget-pane-content.scrollable-y > div > div > div:nth-child(4) > div > div > div:nth-child(2)')
    // <button jstcache="871" style="display:none"></button>
    

    // for(let i=0; i<arrOfElements.length; i++){
    //     var tempArr = await page.$$('div.section-result-content');
    //     if(tempArr[i]){
    //         await tempArr[i].click();
    //         await page.waitForNavigation();;
    //         // await page.goBack();
    //         await history.go(-1);
    //         await page.waitForNavigation();;
    //     }else{
    //         break;
    //     }
    // }

    // const arrObj = await forLoop(arrOfElements, page, urls);
    // await arrObj.click();
    // console.log(arrOfElements[0]);
    await Array.from(arrOfElements)[0].click(); 
    await navigationPromise;
    await page.waitForSelector('.section-hero-header-image-hero-container.collapsible-hero-image img');
    var imageUrl = await page.$eval('.section-hero-header-image-hero-container.collapsible-hero-image img', img => img.src);
    await page.waitForSelector('.ugiz4pqJLAG__primary-text.gm2-body-2');
    var divTexts = await page.$$eval('.ugiz4pqJLAG__primary-text.gm2-body-2', divs => divs.map(div => div.innerText));
    var [address, city, stateZip] = divTexts[0].split(', ');
    var [state, zip] = stateZip.split(' ');
    var phoneNumber = divTexts[2];
    var website = divTexts[1];
    // console.log(imageUrl+'\n'+address+'\n'+city+'\n'+state+'\n'+zip+'\n'+phoneNumber+'\n'+website);
    urls.push({imageUrl: imageUrl, address: address, city: city, state: state, zip: zip, phoneNumber: phoneNumber, website: website});

    await page.waitForSelector('button.section-back-to-list-button'); 
    var backToResults = await page.$('button.section-back-to-list-button');
    await backToResults.click(); 
    // await page.goBack();     // don't use page.goBack(), instead select the back button and click it
    await navigationPromise;


    await page.waitForSelector('div.section-result-content'); 
    var arrOfElements = await page.$$('div.section-result-content');
    await Array.from(arrOfElements)[1].click(); 
    await navigationPromise;
    await page.waitForSelector('button.section-back-to-list-button'); 
    var backToResults = await page.$('button.section-back-to-list-button');
    await backToResults.click(); 
    await navigationPromise;


    await page.waitForSelector('div.section-result-content'); 
    var arrOfElements = await page.$$('div.section-result-content');
    await Array.from(arrOfElements)[2].click(); 
    await navigationPromise;
    await page.waitForSelector('button.section-back-to-list-button'); 
    var backToResults = await page.$('button.section-back-to-list-button');
    await backToResults.click(); 
    await navigationPromise;


    await page.waitForSelector('div.section-result-content'); 
    var arrOfElements = await page.$$('div.section-result-content');
    await Array.from(arrOfElements)[3].click(); 
    await navigationPromise;
    await page.waitForSelector('button.section-back-to-list-button'); 
    var backToResults = await page.$('button.section-back-to-list-button');
    await backToResults.click(); 
    await navigationPromise;


    await page.waitForSelector('div.section-result-content'); 
    var arrOfElements = await page.$$('div.section-result-content');
    await Array.from(arrOfElements)[4].click(); 
    await navigationPromise;
    await page.waitForSelector('button.section-back-to-list-button'); 
    var backToResults = await page.$('button.section-back-to-list-button');
    await backToResults.click(); 
    await navigationPromise;


    await page.waitForSelector('div.section-result-content'); 
    var arrOfElements = await page.$$('div.section-result-content');
    await Array.from(arrOfElements)[5].click(); 
    await navigationPromise;
    await page.waitForSelector('button.section-back-to-list-button'); 
    var backToResults = await page.$('button.section-back-to-list-button');
    await backToResults.click(); 
    await navigationPromise;


    await page.waitForSelector('div.section-result-content'); 
    var arrOfElements = await page.$$('div.section-result-content');
    await Array.from(arrOfElements)[6].click(); 
    await navigationPromise;
    await page.waitForSelector('button.section-back-to-list-button'); 
    var backToResults = await page.$('button.section-back-to-list-button');
    await backToResults.click(); 
    await navigationPromise;


    await page.waitForSelector('div.section-result-content'); 
    var arrOfElements = await page.$$('div.section-result-content');
    await Array.from(arrOfElements)[7].click(); 
    await navigationPromise;
    await page.waitForSelector('button.section-back-to-list-button'); 
    var backToResults = await page.$('button.section-back-to-list-button');
    await backToResults.click(); 
    await navigationPromise;


    await page.waitForSelector('div.section-result-content'); 
    var arrOfElements = await page.$$('div.section-result-content');
    await Array.from(arrOfElements)[8].click(); 
    await navigationPromise;
    await page.waitForSelector('button.section-back-to-list-button'); 
    var backToResults = await page.$('button.section-back-to-list-button');
    await backToResults.click(); 
    await navigationPromise;


    await page.waitForSelector('div.section-result-content'); 
    var arrOfElements = await page.$$('div.section-result-content');
    await Array.from(arrOfElements)[9].click(); 
    await navigationPromise;
    await page.waitForSelector('button.section-back-to-list-button'); 
    var backToResults = await page.$('button.section-back-to-list-button');
    await backToResults.click(); 
    await navigationPromise;

    //button#n7lv7yjyC35__section-pagination-button-next
    await page.waitForSelector('button#n7lv7yjyC35__section-pagination-button-next'); 
    var nextPageResults = await page.$('button#n7lv7yjyC35__section-pagination-button-next');
    await nextPageResults.click(); 
    await navigationPromise;


    ////////////////////////// list of results on current page ////////////////////////////

    // var searchKey = "san francisco japanese market";
    // var searchKey = "seattle marketing firm";
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

    // console.log("result", companies);
    let rlist = [{key: searchKey, value: companies}];
    res.status(200).send(rlist);
});