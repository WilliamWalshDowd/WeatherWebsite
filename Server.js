const APIKEY = 'YOUR KEY HERE'
const CACHE_ENABLED = true

const apis = {
    forecast: 'https://api.openweathermap.org/data/2.5/weather',
    pollution: 'http://api.openweathermap.org/data/2.5/air_pollution',
    weatherForcast3Day: 'http://api.openweathermap.org/data/2.5/forecast',
}

const express = require('express')
const app = express()
const port = 3000
const path = require("path")

let publicPath = path.resolve(__dirname,"public")
console.log(publicPath)
app.use(express.static(publicPath))

app.get('/', function (req, res) {
    res.sendFile(publicPath + "/home.html");
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

const iconLink1 = "https://openweathermap.org/img/wn/"
const iconLink2 = "@2x.png"

const getCoordsCacheIndex = ({ lat, long }) => `${lat}:${long}`

app.get('/CitySearch/:city', weatherInCity)
function weatherInCity (req, res) {
    let city = `${req.params.city}`
    console.log(`city = ${city}`)

    if (CACHE_ENABLED && city in cache.cities) {
        let cityData = cache.cities[city]
        console.log(`data for ${city} city read from cache`)
        res.json(cityData)
        return
    }

    // chech if in cache
    const url = `${apis.forecast}?q=${city}&appid=${APIKEY}&units=metric`
    let data = fetch(url)

    data.then(
        response => response.json()
    ).then ( json => {
        const { main, coord, weather, wind, dt } = json || {};
        if (!main || !coord) {
            res.status(404).send('City not found');
        } else {
            const date = new Date(dt * 1000).toDateString();
            const { speed } = wind || {};
            let { temp } = main || {};
            temp = temp.toFixed(0)
            const { lon, lat } = coord || {};
            const wZero = weather && weather.length > 0 ? weather[0] : {};
            const { description } = wZero || {};
            const { icon } = wZero || {};
            let tempSummary = ''
            if (temp < 8) {
                tempSummary = 'cold';
            } else if (temp >= 8 && temp <= 24) {
                tempSummary = 'mild';
            } else {
                tempSummary = 'hot';
            }

            let cityData = {
                temp,
                disc: description,
                long: lon,
                lat,
                icon : (iconLink1 + icon + iconLink2),
                tempSummary : tempSummary || 'none',
                date,
                windSp: speed,
            }

            //cache data
            cache.cities[city] = cityData;
            console.log(`data for ${city} city saved to cache`);

            res.json(cityData)
        }
    })
}

app.get('/Pollution/:long/:lat', polutionAtLongLat)
function polutionAtLongLat(req, res) {
    const { long, lat } = req.params
    const coords = getCoordsCacheIndex(req.params);

    // chech if in cache
    if (CACHE_ENABLED && coords in cache.pollution) {
        let polutionData = cache.pollution[coords];
        console.log(`data for ${coords} pollution read from cache`);
        res.json(polutionData);
        return
    }

    const url = `${apis.pollution}?lat=${lat}&lon=${long}&appid=${APIKEY}`
    let fetchData = fetch(url)

    fetchData.then(
        response => response.json()
    ).then ( json => {
        const { list } = json || {};
        const list0 = list && list.length > 0 ? list[0] : {};
        const { main, components} = list0 || {};
        const { aqi } = main || {};

        let polutionData = {
            aqi,
            components
        }

        //cache data
        cache.pollution[coords] = polutionData;
        console.log(`data for ${coords} pollution saved to cache`);

        res.json(polutionData)
    })
}

app.get('/3DayForcast/:long/:lat', weatherForcast3Day)
function weatherForcast3Day(req, res) {
    const { long, lat } = req.params
    const coords = getCoordsCacheIndex(req.params);

    if (CACHE_ENABLED && coords in cache.forecast) {
        let forecastData = cache.forecast[coords];
        console.log(`data for ${coords} forecast read from cache`);
        res.json(forecastData)
        return
    }

    const url = `${apis.weatherForcast3Day}?lat=${lat}&lon=${long}&appid=${APIKEY}&units=metric`
    let data = fetch(url)

    let forecastData = {}

    data.then(
        response => response.json()
    ).then ( json => {
        const { list } = json;
        if (!list) {
            console.log('weatherForcast3Day', json);
        }
        for(let i = 0; i < 24; i += 8) {
            console.log(list[i])
            const { dt, weather } = list[i] || {};
            let date = new Date(dt * 1000).toDateString();

            let dataSlice = list.slice(i, i+8);

            const weather0 = weather && weather.length > 0 ? weather[0] : {};
            const { icon, description, main } = weather0 || {};
            let isRaining = (main === 'Rain' || main === 'Drizzle' ? true : false)

            let temp = 0;
            let speed = 0;
            let rainFall = 0;
            for (let j = 0; j < dataSlice.length; j++) {
                temp += dataSlice[j].main.temp;
                speed += ('wind' in dataSlice[j] ? dataSlice[j].wind.speed : 0)
                rainFall += ('rain' in dataSlice[j] ? dataSlice[j].rain['3h'] : 0);
            }

            temp = (temp/dataSlice.length).toFixed(0);
            speed = (speed/dataSlice.length).toFixed(2);
            rainFall = rainFall.toFixed(2);

            let tempSummary = ''
            if (temp < 8) {
                tempSummary = 'cold';
            } else if (temp >= 8 && temp <= 24) {
                tempSummary = 'mild';
            } else {
                tempSummary = 'hot';
            }
            forecastData[date.slice(0,-5)] = {
                temp: temp || 0,
                windSp: speed || 0,
                rain: rainFall || 0,
                icon : (iconLink1 + icon + iconLink2),
                tempSummary : tempSummary || 'none',
                description : description,
                isRaining : isRaining
            }
        }
        console.log(forecastData)
        //cache data
        cache.forecast[coords] = forecastData;
        console.log(`data for ${coords} forecast saved tocached`);

        res.json(forecastData)
    })

}

let cache = {
    cities: {},
    pollution: {},
    forecast: {},
};