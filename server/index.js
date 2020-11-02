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
// after search, on current page, click to each result, scrape that result page, go back to previous page, return results
const loopClickCompResult = async (page, navigationPromise) => {
    // companies on current page
    var curPageCompanies = [];
    // company data keys
    var matchAddress = '';
    var matchPhoneNumber = '';
    var matchWebsite = '';
    var address = '';
    var city = '';
    var stateZip = '';
    var state = '';
    var zip = '';
    var phoneNumber = '';
    var website = '';
    // regular expression for full address
    const regexMatchAddress = /\d+ \d*\w+ \w+.*, \w+, \w+ \d+/g;
    // regular expression for domain name
    const regexDomainName = /(https?:\/\/)?(www\.)?([\w\d]+)\.([\w]+)(\.[\w]+)?(\/[^ ]*)?/g;
    // regular expression for phone number
    const regexPhoneNum = /((\d)\D)?(\(?(\d\d\d)\)?)?\D(\d\d\d)\D(\d\d\d\d)/g;
    
    // I plan to identify Ads in the later version
    // await page.waitForSelector('div.section-result-content');
    // var numOfCurResult = await page.evaluate(() => {
    //     var arr = [];
    //     var elements = document.querySelectorAll('div.section-result-content');
    //     for(var i=0; i<elements.length; i++){
    //         if(elements[i].querySelector('.section-result-title-wta-icon')){
    //             arr.push(true);
    //         }else{
    //             arr.push(false);
    //         }
    //     }
    //     return arr;
    // });
    // console.log('numOfCurResult: ', numOfCurResult);

    // need to reevaluate number of results, sometime will keep using firsttime result, I applied backup plan
    await page.waitForSelector('div.section-result-content');
    var numOfCurResult = Array.from(await page.$$('div.section-result-content')).length;
    console.log("# of results this page: ", numOfCurResult);

    // click to each result, scrape that result page, go back to previous page
    for(var i=0; i<numOfCurResult; i++){
        await page.waitForSelector('div.section-result-content'); 
        var arrOfElements = await page.$$('div.section-result-content');
        console.log(i);
        // my backup plan, check for undefined / null index
        if(Array.from(arrOfElements)[i]){
            await Array.from(arrOfElements)[i].click(); 
            await navigationPromise;
            await page.waitForSelector('.section-hero-header-image-hero-container.collapsible-hero-image img');
            // var imageUrl = await page.$eval('.section-hero-header-image-hero-container.collapsible-hero-image img', img => img.src);
            var imageUrl = await page.evaluate((selector) => {
                return document.querySelector(selector).getAttribute('src').replace('/', '')
            }, '.section-hero-header-image-hero-container.collapsible-hero-image img');
            await page.waitForSelector('.ugiz4pqJLAG__primary-text.gm2-body-2');
            // array of string company data, array size will differ by differ company
            // I use regex to parse data, don't know why some url not like my regex
            var divTexts = await page.$$eval('.ugiz4pqJLAG__primary-text.gm2-body-2', divs => divs.map(div => div.innerText));
            console.log(divTexts);
            matchAddress = divTexts.filter(word => word.match(regexMatchAddress))[0];
            if(matchAddress){
                [address, city, stateZip] = matchAddress.split(', ');
                [state, zip] = stateZip.split(' ');
            }
            matchWebsite = divTexts.filter(word => word.match(regexDomainName))[0];
            if(matchWebsite){
                website = matchWebsite;
            }
            matchPhoneNumber = divTexts.filter(word => word.match(regexPhoneNum))[0];
            if(matchPhoneNumber){
                phoneNumber = matchPhoneNumber;
            }
            // console.log(imageUrl+'\n'+address+'\n'+city+'\n'+state+'\n'+zip+'\n'+phoneNumber+'\n'+website);
            // company data formet
            curPageCompanies.push({imageUrl: imageUrl, address: address, city: city, state: state, zip: zip, phoneNumber: phoneNumber, website: website});
            // go back a page
            await page.waitForSelector('button.section-back-to-list-button'); 
            var backToResults = await page.$('button.section-back-to-list-button');
            await backToResults.click(); 
            // await page.goBack();     // don't use page.goBack(), instead select the back button and click it
            await navigationPromise;
        }
    }
    return curPageCompanies;
};

// remove duuplicate at the end
let removeDuplicateResult = (allResult) => {
    const seen = new Set();
    const filteredArr = allResult.filter(el => {
        const duplicate = seen.has(el.website);
        seen.add(el.website);
        return !duplicate;
    });
    return filteredArr;
}

// scrape
async function scrape (searchKey) {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], slowMo: 100});   // need for real server
    // var browser = await puppeteer.launch({headless: false, slowMo: 100});
    // const browser = await puppeteer.launch({slowMo: 100}); // need to slow down to content load

    var page = await browser.newPage();
    // deal with navigation and page timeout, see the link
    // https://www.checklyhq.com/docs/browser-checks/timeouts/
    var navigationPromise =  page.waitForNavigation();
    
    await page.goto('https://www.google.com/maps/');
    await navigationPromise;
    await page.type('input#searchboxinput', searchKey, { delay: 50 });
    // await page.type('input[title="Search"]', searchKey);
    await page.keyboard.press('Enter');
    await navigationPromise;

    
    // var address, city, stateZip, state, zip, phoneNumber, website;

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



    // after search, scraped current page results, go to next page of results
    var temp = [];
    let urls = [];
    let hasNext = true
    while(hasNext) {
        await page.waitForSelector('div.section-result-content');
        temp = await loopClickCompResult(page,navigationPromise);
        urls = [...urls, ...temp];
        // need to check for disabled, because disabled element can still be click, can cause invite loop
        var nextBtnDisabled = await page.$('button#n7lv7yjyC35__section-pagination-button-next:disabled');
        var nextPageResults = await page.$('button#n7lv7yjyC35__section-pagination-button-next');
        if(nextBtnDisabled !== null){
            hasNext = false;
            console.log(hasNext);
        }else if(nextPageResults !== null){
            console.log(hasNext);
            await nextPageResults.click(); 
            await navigationPromise;
        }
    }



    ////////////////////////// another list of results on current page ////////////////////////////

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
    let uniqueCompanies = removeDuplicateResult(companies);

    // console.log("result", companies);
    let rlist = [{searchKey: searchKey, companiesData: uniqueCompanies}];
    res.status(200).send(rlist);
});