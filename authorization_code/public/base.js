// Music Recommendations
// by Dion Earle

// TODO: use regex or similar tool so multi artist albums (e.g. pinata by freddie gibbs & madlib) are seen as the same as pinata by freddie gibbs,
// another example is fetti by currensy, freddie gibbs & alchemist is same as fetti by currensy,
// and that albums ending with something in brackets (e.g. rodeo (expanded edition) by travis scott) is seen the same as rodeo by travis scott
// This also impacts artist display, as for Freddie Gibbs & Madlib it can't get link or image, yet works for Freddie Gibbs

// TODO: Once list is displayed, have a way to search again without refreshing the page
// or going back.
// Could be done by simply having banner above the list stating to 'Try another search'
// which links back to the search banner

// TODO: setup pagination for results

// TODO: work on CSS and HTML to make landing page more appealing
// + all other aspects look more clean

// TODO: option to display releases with less than 'x' plays for you
// (replaces only unheard releases. e.g. 0 for unheard)
// Also only show releases if not listned to in past month/year (for forgotten gems etc.)

// TODO: option to only display albums released in past week/month/year

// first we declare my last.fm API key
const key = '3e0c61f86ab0621665f8bb0bccd2eaf9';

// here we specify the url for the last.fm API
const url = new URL('http://ws.audioscrobbler.com/2.0/');

// we also specify the search options to be used for all API get requests
const options = {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
}

// here we setup an event listener for when the user enters their last.fm username
document.forms.enterUsername.addEventListener('submit', (event) => {

    // we ensure the default action for a submit button is prevented
    event.preventDefault();

    // we call another function to handle the given input
    handleUsername();
});

// handles the enterUsername form
function handleUsername() {

    // we extract the last.fm username from the form
    const username = document.forms.enterUsername.elements.username.value;

    // we first check if the username field is empty
    if (username === '') {
        alert('Please enter a last.fm username');
        // if not, we can begin the search
    } else {

        // we first remove the search settings form from the screen
        document.getElementById('enterUsername').style.display = 'none';

        // and now retrieve this user's last.fm friends' names
        getFriends(username);
    }
}

// fetches the user's last.fm friends
function getFriends(username) {

    // first we make the progress bar visible and describe the current status
    document.getElementById('progress').style.width = '0%';
    document.getElementById('status').textContent = 'Getting your last.fm friends...';
    document.getElementById('outer-progress').style.visibility = 'visible';

    // we have a list of promises and a list of the user's friends
    const promiseList = [];
    const friends = [];

    // we also keep track of the progress for this section
    let progress = 0;

    // here we setup the query user.getfriends
    const query = {
        method: 'user.getfriends',
        user: username,
        api_key: key,
        page: 1,
        format: 'json'
    }

    // we attach this query to the last.fm api URL
    url.search = new URLSearchParams(query);

    // we then fetch this information
    fetch(url, options)
        .then(response => {

            // if we the fetch request failed for whatever reason, we throw an error
            if (!response.ok) {
                throw new Error(response.statusText);
            }

            return response.json();
        })
        .then(response => {

            // the response contains the first page of the user's friends.
            // from this, we can extract their usernames and add them to our list
            for (let i = 0; i < response.friends.user.length; i++) {
                friends.push(response.friends.user[i].name);
            }

            // we also update the progress bar to show the progress for this section
            progress++;
            document.getElementById('progress').style.width = ((progress / response.friends['@attr'].totalPages) * 100) + '%';

            // if there are additional pages of friends, we want to repeat this process
            for (let i = 2; i <= response.friends['@attr'].totalPages; i++) {

                // we use the same query as before yet with an update page number
                const query = {
                    method: 'user.getfriends',
                    user: username,
                    api_key: key,
                    page: i,
                    format: 'json'
                }

                // we attach this query to the last.fm api URL
                url.search = new URLSearchParams(query);

                // we add the fetch request to a promise list so we only move
                // to the next step once all pages have been received
                promiseList.push(fetch(url, options)
                    .then(response => {

                        // if we the fetch request failed for whatever reason, we throw an error
                        if (!response.ok) {
                            throw new Error(response.statusText);
                        }

                        return response.json();
                    })
                    .then(response => {

                        // once again we copy all of the friend's usernames to our list
                        for (let i = 0; i < response.friends.user.length; i++) {
                            friends.push(response.friends.user[i].name);
                        }

                        // we again update the progress bar to show the progress for this section
                        progress++;
                        document.getElementById('progress').style.width = ((progress / response.friends['@attr'].totalPages) * 100) + '%';

                    })
                    .catch(error => {

                        // if there was an error, we alert the user
                        alert(error + '!');

                        // we also want to hide the progress and display the search form again
                        document.getElementById('outer-progress').style.visibility = 'hidden';
                        document.getElementById('enterUsername').style.display = 'block';
                    }));
            }

            // once we have received all pages of the user's friends, we call an
            // inputData function to setup the next form
            Promise.all(promiseList)
                .then(function () {
                    inputData(username, friends);
                });
        })
        .catch(error => {

            // if there was an error, we alert the user
            alert(error + '!');

            // we also want to hide the progress and display the search form again
            document.getElementById('outer-progress').style.visibility = 'hidden';
            document.getElementById('enterUsername').style.display = 'block';
        });
}

// sets up the search form once we have the last.fm username and list of friends
function inputData(username, friends) {

    // first we hide the progress bar from the previous section
    document.getElementById('progress').style.width = '0%';
    document.getElementById('outer-progress').style.visibility = 'hidden';
    document.getElementById('searchSettings').style.display = 'block';

    // here we setup an event listener for when the user enters their last.fm username
    document.forms.searchSettings.addEventListener('submit', (event) => {

        // we ensure the default action for a submit button is prevented
        event.preventDefault();

        // we call another function to handle the given input
        handleSearchSettings(username, friends);
    });
}

// handles the searchSettings form
function handleSearchSettings(username, friends) {

    const searchType = document.forms.searchSettings.elements.searchType.value;
    const timePeriod = document.forms.searchSettings.elements.timePeriod.value;
    const unheard = document.forms.searchSettings.elements.unheard.checked;

    // we first remove the search settings form from the screen
    document.getElementById('searchSettings').style.display = 'none';

    // then we begin fetching the top results for each friend in the friends list
    getTopResults(username, friends, timePeriod, unheard, searchType);
}

// fetches the top results of a selected type for a list of friends
function getTopResults(username, friends, timePeriod, unheard, searchType) {

    // first we make the progress bar visible and describe the current status
    document.getElementById('status').textContent = 'Getting the top results from all your friends...';
    document.getElementById('outer-progress').style.visibility = 'visible';

    // since we don't want to continue any further until we receive all results, we use a list of promises
    const promiseList = [];

    // we store all of the top results into an array
    const results = [];

    // we also keep track of the progress for this section
    let progress = 0;

    // we loop through each user in the friends list
    for (let i = 0; i < friends.length; i++) {

        // we search using the appropriate query
        const query = {
            method: 'user.gettop' + searchType + 's',
            user: friends[i],
            api_key: key,
            period: timePeriod,
            format: 'json'
        };

        // we attach this query to the last.fm api URL
        url.search = new URLSearchParams(query);

        // we then push this fetch request to the list of promises
        promiseList.push(fetch(url, options)
            .then(response => {

                // if we the fetch request failed for whatever reason, we throw an error
                if (!response.ok) {
                    throw new Error(response.statusText);
                }

                return response.json();

            })
            .then(response => {

                // we loop through each result in the response array
                for (let i = 0; i < response['top' + searchType + 's'][searchType].length; i++) {

                    // we declare the current result item in the list
                    const result = response['top' + searchType + 's'][searchType][i];

                    // here we create variables for various metadata for the given result
                    const score = 51 - result['@attr'].rank;
                    const name = result.name;
                    const playcount = parseInt(result.playcount);
                    const mbid = result.mbid;
                    const image = result.image[3]['#text'];

                    let artist = undefined;

                    // if it is an album or track, we also want to fetch the artist for this release
                    if (searchType !== 'artist') {
                        artist = result.artist.name;
                    }

                    // before adding this to the results array, we want to ensure
                    // it doesn't already exist
                    let found = false;
                    for (let i = 0; i < results.length; i++) {

                        // if it is already in results array, we simply update the score and playcount
                        if (results[i].name === name
                            && (artist === undefined
                                || results[i].artist === artist)) {
                            results[i].score += score;
                            results[i].playcount += playcount;
                            found = true;
                            break;
                        }
                    }

                    // if it wasn't in the results array, we add it
                    if (!found) {

                        results.push({
                            'score': score,
                            'name': name,
                            'artist': artist,
                            'playcount': playcount,
                            'mbid': mbid,
                            'image': image
                        });
                    }
                }

                // we update the progress bar to show the progress for this section
                progress++;
                document.getElementById('progress').style.width = ((progress / friends.length) * 100) + '%';
            })
            .catch(error => {
                // if there was an error, we alert the user
                alert(error + '!');

                // we also want to hide the progress and display the search form again
                document.getElementById('outer-progress').style.visibility = 'hidden';
                document.getElementById('enterUsername').style.display = 'block';
            }));
    }

    // once all fetch requests have been returned, we can try and continue
    Promise.all(promiseList)
        .then(function () {
            sortResults(username, friends, unheard, searchType, results)
        })
}

// given all of the required results, we sort them in the correct order and potentially filter some out
function sortResults(username, friends, unheard, searchType, results) {

    // we use the sort function to order the results based on their score
    results.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

    if (unheard) {

        // first we make the progress bar visible and describe the current status
        document.getElementById('progress').style.width = '0%';
        document.getElementById('status').textContent = 'Filtering out results you have already heard...';

        let unheardReleases = [];
        filterUnheard(username, searchType, results, 0, unheardReleases);
    } else {
        // for the first 50 items in the results array, we want to display them
        pageDisplay(searchType, results, 0);
    }
}

// checks a user's listen history to determine whether they have scrobbled an item before
function filterUnheard(username, searchType, results, start, unheardReleases) {

    // we keep a list of promises so we don't continue until all results are fetched
    const promiseList = [];

    // we also keep track of the progress for this section
    let progress = start;

    let max = start + 50;
    if (max > results.length) {
        max = results.length;
    }

    for (let i = start; i < max; i++) {

        let query = {};

        // depending on the result type, we need to modify
        // the query and its parameters
        if (searchType === 'artist') {
            query = {
                method: searchType + '.getInfo',
                artist: results[i].name,
                username: username,
                api_key: key,
                format: 'json'
            };
        } else if (searchType === 'album') {
            query = {
                method: searchType + '.getInfo',
                artist: results[i].artist,
                album: results[i].name,
                username: username,
                api_key: key,
                format: 'json'
            };
        } else {
            query = {
                method: searchType + '.getInfo',
                artist: results[i].artist,
                track: results[i].name,
                username: username,
                api_key: key,
                format: 'json'
            };
        }

        // we then add this search query to the url
        url.search = new URLSearchParams(query);

        // we then push this fetch request to the list of promises
        promiseList.push(fetch(url, options)
            .then(response => {

                // if we the fetch request failed for whatever reason, we throw an error
                if (!response.ok) {
                    throw new Error(response.statusText);
                }

                return response.json();

            })
            .then(response => {

                if (response[searchType] !== undefined) {

                    // if the playcount for this item is not zero, we set the score to be negative so it won't be displayed
                    if (searchType === 'artist') {
                        if (response[searchType].stats.userplaycount === '0') {
                            unheardReleases.push(results[i]);
                        }
                    } else {
                        if (response[searchType].userplaycount === '0') {
                            unheardReleases.push(results[i]);
                        }

                    }
                }

                // we update the progress bar to show the progress for this section
                progress++;
                document.getElementById('progress').style.width = ((progress / results.length) * 100) + '%';

            })
            .catch(error => {
                // if there was an error, we alert the user
                alert(error + '!');

                // we also want to hide the progress and display the search form again
                document.getElementById('outer-progress').style.visibility = 'hidden';
                document.getElementById('enterUsername').style.display = 'block';
            }));
    }

    // once we have filtered through all results we can display the first page
    Promise.all(promiseList)
        .then(function () {
            if (unheardReleases.length >= 50 || progress == results.length) {
                pageDisplay(searchType, unheardReleases, 0);
            } else {
                filterUnheard(username, searchType, results, start + 50, unheardReleases);
            }

        })
}

// displays a given page of results
function pageDisplay(searchType, results, start) {

    // first we hide the progress bar from the previous section
    document.getElementById('progress').style.width = '0%';
    document.getElementById('outer-progress').style.visibility = 'hidden';
    document.getElementById('new-results').style.display = 'block';

    // we then loop through the next 50 items in the results
    for (let i = 0; i < 50; i++) {
        displayResult(i + 1, searchType, results[i]);
    }
}

// given metadata about a result, it is displayed on the page
function displayResult(rank, searchType, result) {

    const release = document.createElement('a');
    release.classList.add('row');

    const numColumn = document.createElement('div');
    numColumn.classList.add('numColumn');
    const num = document.createElement('div');
    num.classList.add('rankCircle');
    num.textContent = rank;
    numColumn.appendChild(num);
    release.appendChild(numColumn);

    const imgColumn = document.createElement('div');
    imgColumn.classList.add('imgColumn');
    const image = document.createElement('img');
    image.classList.add('albumArt');
    image.src = result.image;
    imgColumn.appendChild(image);
    release.appendChild(imgColumn);

    const infoColumn = document.createElement('div');
    infoColumn.classList.add('infoColumn');
    const nameText = document.createElement('h2');
    nameText.classList.add('nameText');
    nameText.textContent = result.name;
    infoColumn.appendChild(nameText);

    if (searchType !== 'artist') {
        const artistText = document.createElement('p');
        artistText.textContent = result.artist;
        artistText.classList.add('artistText');
        infoColumn.appendChild(artistText);
    }

    const spotifyLink = document.createElement('a');
    spotifyLink.classList.add('btn');
    spotifyLink.classList.add('btn-success');
    spotifyLink.textContent = 'Open in Spotify';
    infoColumn.appendChild(spotifyLink);
    release.appendChild(infoColumn);

    document.getElementById('display-results').appendChild(release);

    connectSpotify(result, searchType, image, spotifyLink);
}

// searches the release on spotify and creates a link to it
function connectSpotify(input, searchType, image, spotifyLink) {

    const artist = input.artist;
    const name = input.name;

    function getHashParams() {
        var hashParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        while (e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        return hashParams;
    }

    var params = getHashParams();
    const access_token = params.access_token;

    // here we specify the url for the last.fm API
    const url = new URL('https://api.spotify.com/v1/search');

    // we also specify the search options to be used for all API get requests
    const options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + access_token
        }
    }

    let query = {};

    if (searchType !== 'artist') {
        query = {
            q: artist + ' ' + name,
            type: searchType
        }
    } else {
        query = {
            q: name,
            type: searchType
        }
    }

    // we attach this query to the last.fm api URL
    url.search = new URLSearchParams(query);

    // we then fetch this information
    fetch(url, options)
        .then(response => {

            // if we the fetch request failed for whatever reason, we throw an error
            if (!response.ok) {
                throw new Error(response.statusText);
            }

            return response.json();
        })
        .then(response => {

            if (searchType == 'artist') {
                if (response.artists.items.length == 0) {
                    spotifyLink.textContent = 'Couldn\'t find on Spotify';
                } else {
                    image.src = response.artists.items[0].images[0].url;
                    spotifyLink.href = response.artists.items[0].external_urls.spotify;
                }
            } else if (searchType == 'track') {
                if (response.tracks.items.length == 0) {
                    spotifyLink.textContent = 'Couldn\'t find on Spotify';
                } else {
                    image.src = response.tracks.items[0].album.images[0].url;
                    spotifyLink.href = response.tracks.items[0].external_urls.spotify;
                }
            } else {
                if (response.albums.items.length == 0) {
                    spotifyLink.textContent = 'Couldn\'t find on Spotify';
                } else {
                    spotifyLink.href = response.albums.items[0].external_urls.spotify;
                }
            }
        });

}