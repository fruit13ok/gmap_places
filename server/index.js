// REQUIREMENTS

// native
const path = require('path');

// 3rd party
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require("node-fetch");
var userAgent = require('user-agents');

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
function renInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}

// after search, on current page, click to each result, scrape that result page, go back to previous page, return results
const loopClickCompResult = async (page, navigationPromise) => {
    // companies on current page
    var curPageCompanies = [];
    // company data keys
    var matchAddress = '';
    var matchPhoneNumber = '';
    var matchWebsites = [];
    var matchWebsite = '';
    var logo = '';
    var category = '';
    var name = '';
    var shareBtn = null;
    var mapID = '';
    var closeBtn = null;
    var divTexts = '';
    var address = '';
    var city = '';
    var stateZip = '';
    var state = '';
    var zip = '';
    var phonenumber = '';
    var website = '';
    var dropdownListBtn = null;
    var businesshours = [];
    var tmpBHours = [];
    var companyJson = {};
    // regular expression for full address
    const regexAddress = /\d+ \d*\w+ \w+.*, \w+, \w+ \d+/g;
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
    // await page.waitForTimeout(renInt(1000, 2000));
    var numOfCurResult = Array.from(await page.$$('div.section-result-content')).length;
    await page.waitForTimeout(renInt(500, 600));
    console.log("# of results this page: ", numOfCurResult);

    // click to each result, scrape that result page, go back to previous page
    for(var i=0; i<numOfCurResult; i++){
        await page.waitForSelector('div.section-result-content'); 
        // await page.waitForTimeout(renInt(500, 600));
        var arrOfElements = await page.$$('div.section-result-content');
        await page.waitForTimeout(renInt(500, 600));
        // when console log show i but not each content, it is ok,
        // that mean it didn't count the current page result size
        console.log(i);
        // my backup plan, check for undefined / null index
        if(Array.from(arrOfElements)[i]){
            // await Array.from(arrOfElements)[i].hover();
            await Array.from(arrOfElements)[i].click();
            await navigationPromise;
            await page.waitForTimeout(renInt(500, 600));

            await page.waitForSelector('.section-hero-header-image-hero-container.collapsible-hero-image img');
            // var logo = await page.$eval('.section-hero-header-image-hero-container.collapsible-hero-image img', img => img.src);
            logo = await page.evaluate((selector) => {
                // return document.querySelector(selector).getAttribute('src').replace('//', '');
                let el = document.querySelector(selector);
                return el ? el.getAttribute('src').replace('//', '') : "image error";
            }, '.section-hero-header-image-hero-container.collapsible-hero-image img');
            await page.waitForTimeout(renInt(500, 600));

            await page.waitForSelector('div.section-hero-header-title-description');
            // document.querySelector('div.section-hero-header-title-description').innerText.split(/\r?\n/).pop();
            category = await page.evaluate((selector) => {
                let el = document.querySelector(selector);
                return el ? el.innerText.split(/\r?\n/).pop() : "category error";
            }, 'div.section-hero-header-title-description');
            await page.waitForTimeout(renInt(500, 600));
            
            await page.waitForSelector('.section-hero-header-title-title');
            // name = await page.$eval('.section-hero-header-title-title', el => el.innerText);
            name = await page.evaluate((selector) => {
                let el = document.querySelector(selector);
                return el ? el.innerText : "name error";
            }, '.section-hero-header-title-title');
            await page.waitForTimeout(renInt(500, 600));

            // document.querySelector('button[aria-label="Share"]').click()
            // document.querySelector('input.section-copy-link-input').value
            // document.querySelector('button[aria-label="Close"]').click()
            await page.waitForSelector('button[aria-label="Share"]');
            shareBtn = await page.$('button[aria-label="Share"]');
            await page.waitForTimeout(renInt(500, 600));
            if(shareBtn){
                await shareBtn.click();
                await navigationPromise;
                await page.waitForTimeout(renInt(2000, 3000));
            }
            await page.waitForSelector('input.section-copy-link-input');
            mapID = await page.evaluate((selector) => {
                let el = document.querySelector(selector);
                return el ? el.value : "no mapID error";
            }, 'input.section-copy-link-input');
            await page.waitForTimeout(renInt(500, 600));
            await page.waitForSelector('button[aria-label="Close"]');
            closeBtn = await page.$('button[aria-label="Close"]');
            await page.waitForTimeout(renInt(500, 600));
            if(closeBtn){
                await closeBtn.click();
                await navigationPromise;
                await page.waitForTimeout(renInt(2000, 3000));
            }

            // array of string company data, array size will differ by differ company
            // I use regex to parse data
            await page.waitForSelector('.ugiz4pqJLAG__primary-text.gm2-body-2');
            // divTexts = await page.$$eval('.ugiz4pqJLAG__primary-text.gm2-body-2', divs => divs.map(div => div.innerText));
            divTexts = await page.evaluate((selector) => {
                let els = Array.from(document.querySelectorAll(selector));
                return els ? els.map(el => el.innerText) : "divTexts error";
            }, '.ugiz4pqJLAG__primary-text.gm2-body-2');
            await page.waitForTimeout(renInt(500, 600));
            if(divTexts != "divTexts error"){
                console.log(divTexts);
                matchAddress = divTexts.filter(word => word.match(regexAddress))[0];
                if(matchAddress){
                    address = matchAddress;
                    // [address, city, stateZip] = matchAddress.split(', ');
                    // [state, zip] = stateZip.split(' ');
                }
                matchWebsites = divTexts.filter(word => word.match(regexDomainName));
                // some content had multiple urls, last one looks better
                matchWebsite = matchWebsites[matchWebsites.length - 1];
                if(matchWebsite){
                    website = matchWebsite;
                }
                matchPhoneNumber = divTexts.filter(word => word.match(regexPhoneNum))[0];
                if(matchPhoneNumber){
                    phonenumber = matchPhoneNumber;
                }
            }
            await page.waitForTimeout(renInt(500, 600));

            // document.querySelector('.section-open-hours-button').click();
            // document.querySelector('.section-open-hours-container').innerText;
            try {
                await page.waitForSelector('.section-open-hours-button', { timeout: 10000 }); // default 30000
                dropdownListBtn = await page.$('.section-open-hours-button');
                await page.waitForTimeout(renInt(500, 600));
                if(dropdownListBtn){
                    await dropdownListBtn.click();
                    await navigationPromise;
                    await page.waitForTimeout(renInt(2000, 3000));
                }
                await page.waitForSelector('.section-open-hours-container');
                tmpBHours = await page.evaluate((selector) => {
                    let el = document.querySelector(selector);
                    return el ? el.innerText : "no businesshours error";
                }, '.section-open-hours-container');
                await page.waitForTimeout(renInt(500, 600));
                if(tmpBHours != "businesshours error"){
                    var hoursArr = tmpBHours.replace(/\s/g, ' ').split(' ').filter(e=>e!="");
                    var curDay = {};
                    var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                    for (let i=0; i<hoursArr.length; i++){
                        if(days.includes(hoursArr[i])){
                            if(i!=0){
                                businesshours.push(curDay);
                                curDay = {};
                            }
                            curDay.day = hoursArr[i];
                            curDay.hours = "";
                        }else{
                            curDay.hours += hoursArr[i]+" ";
                        }
                        if(i==hoursArr.length-1){
                            businesshours.push(curDay);
                            curDay = {};
                        }
                    }
                    const sorter = {"Monday": 1,"Tuesday": 2,"Wednesday": 3,"Thursday": 4,"Friday": 5,"Saturday": 6,"Sunday": 0};
                    businesshours.sort((a, b)=> sorter[a.day]-sorter[b.day]);
                    console.log(businesshours);
                }
            } catch(error) {
                console.log(error);
            }
            // company data formet
            companyJson = {name: name, category: category, address: address, phonenumber: phonenumber, website: website, logo: logo, mapID: mapID, businesshours: businesshours};
            // console.log(companyJson);
            curPageCompanies.push(companyJson);
            businesshours = [];

            // go back a page
            // await page.waitForSelector('button.section-back-to-list-button'); 
            await page.waitForTimeout(renInt(500, 600));
            var backToResults = await page.$('button.section-back-to-list-button');
            await page.waitForTimeout(renInt(500, 600));
            if(backToResults !== null){
                // await backToResults.hover();
                await backToResults.click();
                await navigationPromise;
                await page.waitForTimeout(renInt(2000, 3000));
            }
            // await backToResults.click(); 
            // await page.goBack();     // don't use page.goBack(), instead select the back button and click it
            // await navigationPromise;
            // await page.waitForTimeout(renInt(1000, 2000));
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
    // const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], ignoreHTTPSErrors: true, slowMo: 100}); // need for real server
    var browser = await puppeteer.launch({headless: false, ignoreHTTPSErrors: true, slowMo: 100});  // need to slow down to content load

    var page = await browser.newPage();
    // deal with navigation and page timeout, see the link
    // https://www.checklyhq.com/docs/browser-checks/timeouts/
    var navigationPromise =  page.waitForNavigation();

    await page.setUserAgent(userAgent.random().toString());
    await page.setDefaultNavigationTimeout(0);
    await page.goto('https://www.google.com/maps/', { timeout: 10000, waitUntil: 'networkidle2', });
    await navigationPromise;
    await page.waitForTimeout(renInt(5000, 6000));
    await page.type('input#searchboxinput', searchKey, { delay: 100 });
    // await page.type('input[title="Search"]', searchKey);
    await page.keyboard.press('Enter');
    await navigationPromise;
    await page.waitForTimeout(renInt(5000, 6000));

    
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


    /*
    // after search, scraped current page results, go to next page of results
    var temp = [];
    let urls = [];
    let hasNext = true
    while(hasNext) {
        // some how wait for div.section-result-content before and inside the loop makes less problem
        // await page.waitForSelector('div.section-result-content');
        temp = await loopClickCompResult(page,navigationPromise);
        await page.waitForTimeout(renInt(500, 600));
        urls = [...urls, ...temp];
        // need to check for disabled, because disabled element can still be click, can cause invite loop
        var nextBtnDisabled = await page.$('button#n7lv7yjyC35__section-pagination-button-next:disabled');
        await page.waitForTimeout(renInt(500, 600));
        var nextPageResults = await page.$('button#n7lv7yjyC35__section-pagination-button-next');
        await page.waitForTimeout(renInt(500, 600));
        if(nextBtnDisabled !== null){
            hasNext = false;
            console.log(hasNext);
        }else if(nextPageResults !== null){
            await page.waitForTimeout(renInt(5000, 6000));
            console.log(hasNext);
            await nextPageResults.hover(); 
            await nextPageResults.click(); 
            await navigationPromise;
            await page.waitForTimeout(renInt(500, 600));
        }
    }
    */
    // after search, scraped current page results, go to next page of results
    // a work around, search smarter by append "near zip code" after search key,
    // also only search first page
    var temp = [];
    let urls = [];
    // some how wait for div.section-result-content before and inside the loop makes less problem
    // await page.waitForSelector('div.section-result-content');
    temp = await loopClickCompResult(page,navigationPromise);
    await page.waitForTimeout(renInt(500, 600));
    urls = [...urls, ...temp];
    // need to check for disabled, because disabled element can still be click, can cause invite loop
    

    // const blockedResourceTypes = [ 'image', 'media', 'font', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset', ]; const skippedResources = [ 'quantserve', 'adzerk', 'doubleclick', 'adition', 'exelator', 'sharethrough', 'cdn.api.twitter', 'google-analytics', 'googletagmanager', 'google', 'fontawesome', 'facebook', 'analytics', 'optimizely', 'clicktale', 'mixpanel', 'zedo', 'clicksor', 'tiqcdn', ]; 
    // const page = await browser.newPage(); 
    // await page.setRequestInterception(true); 
    // await page.setUserAgent(userAgent); 
    // page.on('request', request => { 
    //     const requestUrl = request._url.split('?')[0].split('#')[0]; 
    //     if ( blockedResourceTypes.indexOf(request.resourceType()) !== -1 || skippedResources.some(resource => requestUrl.indexOf(resource) !== -1) ) { 
    //         request.abort(); 
    //     } else { 
    //         request.continue(); 
    //     } 
    // }); 
    // const response = await page.goto(url, { timeout: 25000, waitUntil: 'networkidle2', }); 
    // if (response._status < 400) { 
    //     await page.waitFor(3000); 
    //     let html = await page.content(); 
    //     return html; 
    // }


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

    // const companies = await scrape(searchKey);
    // let uniqueCompanies = removeDuplicateResult(companies);

    // // console.log("result", companies);
    // let rlist = [{searchKey: searchKey, companiesData: uniqueCompanies}];
    // res.status(200).send(rlist);
    try{
        const companies = await scrape(searchKey);
        // res.status(200).send(removeDuplicateResult(companies));
        res.status(200).send(companies);
    }catch(err){
        console.error(err)
        res.status(200).send({error: 'TimeoutError', solution: 'refresh, try again'});
    }
});