//import getLibraryArtists from './library.js';

// here we grab the post form
const searchSettings = document.forms.searchSettings;

// here we setup an event listener for when the create 
// post form is complete
searchSettings.addEventListener('submit', (event) => {

    // we ensure the default action for a submit button is prevented
    event.preventDefault();

    // we call an imported function to handle the post request
    handleInputForm();
});

function handleInputForm() {

    // within this form, we extract the required information
    const username = searchSettings.elements.username.value;
    const timePeriod = searchSettings.elements.timePeriod.value;
    const displayAlbums = searchSettings.elements.displayAlbums.checked;
    const displayArtists = searchSettings.elements.displayArtists.checked;
    const displayTracks = searchSettings.elements.displayTracks.checked;
    const searchType = searchSettings.elements.searchType.checked;

    // TODO: need to check if this is a valid last fm username
    // (possibly by running a test search GET request using API)
    if (username === '') {
        alert('Please enter a last.fm username');
    } else {

        const searchSettingsHTML = document.getElementById('searchSettings');
        searchSettingsHTML.parentNode.removeChild(searchSettingsHTML);
        
        // here we are setting up the progress bar for the following search
        const outerProgress = document.getElementById('outer-progress');
        outerProgress.style.visibility = 'visible';
        const progressBar = document.getElementById('progress');
        
        const status = document.getElementById('status');
        status.textContent = 'Getting your last.fm friends...';

        // here we specify the url for the fetch request
        let url = new URL('http://ws.audioscrobbler.com/2.0/');

        // since the API requires url parameters, we set these here
        let query = {
            method: 'user.getfriends',
            user: username,
            api_key: '3e0c61f86ab0621665f8bb0bccd2eaf9',
            format: 'json'
        };

        // we then add this search query to the url
        url.search = new URLSearchParams(query);

        // here we simply setup the options for the fetch request
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }

        // we now fetch the data
        fetch(url, options)
            .then(response => response.json())
            .then(response => {

                const friendsPromises = [];

                // this initial fetch request is used to determine how many
                // pages of friends this user has.
                // now we have this, we can retrieve the friends page by page
                let totalPages = response.friends['@attr'].totalPages;

                // TODO: Rather than making another fetch request after getting the total
                // pages, should probably get friends info for the first page and then
                // if necessary loop through all remaining pages (e.g. starting from i = 2)
                for (let i = 1; i <= totalPages; i++) {

                    // since the API requires url parameters, we set these here
                    let query = {
                        method: 'user.getfriends',
                        user: username,
                        api_key: '3e0c61f86ab0621665f8bb0bccd2eaf9',
                        page: i,
                        format: 'json'
                    };

                    // we then add this search query to the url
                    url.search = new URLSearchParams(query);

                    friendsPromises.push(fetch(url, options)
                        .then(response => response.json())
                    );

                    let progress = (i / totalPages) * 100;
                    progressBar.style.width = progress + '%';
                }

                Promise.all(friendsPromises)
                    .then(responses => {

                        let friends = [];

                        for (let i = 0; i < responses.length; i++) {

                            const response = responses[i];

                            for (let i = 0; i < response.friends.user.length; i++) {

                                friends.push(response.friends.user[i].name);
                            }
                        }

                        const topAlbumsPromises = [];

                        // here we go through each friend and get their top albums,
                        // artists and tracks. we also use the time period as selected
                        // in the search parameters earlier
                        const status = document.getElementById('status');
                        status.textContent = 'Getting your friend\'s top albums...';

                        // TODO: implement a loading bar like I did on newReleaseTracker
                        for (let i = 0; i < friends.length; i++) {
                            
                            // TODO: implement this for top artists and tracks as well
                            
                            let query = {
                                method: 'user.gettopalbums',
                                user: friends[i],
                                api_key: '3e0c61f86ab0621665f8bb0bccd2eaf9',
                                period: timePeriod,
                                format: 'json'
                            };

                            // we then add this search query to the url
                            url.search = new URLSearchParams(query);

                            topAlbumsPromises.push(fetch(url, options)
                                .then(response => response.json())
                            );

                            let progress = (i / friends.length) * 100;
                            progressBar.style.width = progress + '%';
                        }

                        Promise.all(topAlbumsPromises)
                        .then(responses => {

                            let results = [];

                            for (let i = 0; i < responses.length; i++) {
                                
                                const response = responses[i];

                                for (let i = 0; i < response.topalbums.album.length; i++) {

                                    let album = response.topalbums.album[i];

                                    let score = 51 - album['@attr'].rank;
                                    let name = album.name;
                                    let artist = album.artist.name;
                                    let playcount = parseInt(album.playcount);
                                    let mbid = album.mbid;
                                    let image = album.image[3]['#text'];
                                    // TODO: also store release date to display
                                    
                                    let found = false;

                                    for (let i = 0; i < results.length; i++) {
                                        if (results[i].name === name
                                        && results[i].artist === artist) {
                                            results[i].score += score;
                                            results[i].playcount += playcount;
                                            found = true;
                                            break;
                                        }
                                    }

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
                            }    

                            // rank could also be decided by playcount, but then this favours users
                            // who listen to more music rather than the overall most popular music from
                            // your friends
                            results.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
                            //results.sort((a, b) => parseFloat(b.playcount) - parseFloat(a.playcount));

                            
                            // if we aren't showing all releases, then we need to check through each one to
                            // see if the last.fm user has this release in their library
                            if (!searchType) {

                                const status = document.getElementById('status');
                                status.textContent = 'Filtering out releases you have already heard...';
                                
                                // use the album.getInfo request, giving the mbid and last fm username.
                                // the response will give the user's playcount for this release, and if 0 (or null)
                                // then we keep the release. otherwise we can remove

                                // TODO: COULD ALSO HAVE OPTION WHERE IF PLAYCOUNT IS LESS THAN GIVEN AMOUNT
                                // IT IS STILL DISPLAYED
                                // e.g. 'Display all releases with less than [] plays (default is to display all)' when searching

                                const listenedBeforePromises = [];
                                
                                // TODO: find a way to figure out when we have 50 unheard releases,
                                // as this takes really long and still eventually shows albums you've heard
                                for (let i = 0; i < 100; i++) {

                                    let query = {
                                        method: 'album.getInfo',
                                        artist: results[i].artist,
                                        album: results[i].name,
                                        username: username,
                                        api_key: '3e0c61f86ab0621665f8bb0bccd2eaf9',
                                        format: 'json'
                                    };
        
                                    // we then add this search query to the url
                                    url.search = new URLSearchParams(query);
        
                                    listenedBeforePromises.push(fetch(url, options)
                                        .then(response => response.json())
                                    );
        
                                    let progress = (i / results.length) * 100;
                                    progressBar.style.width = progress + '%';
                                }

                                Promise.all(listenedBeforePromises)
                                .then(responses => {

                                    for (let i = 0; i < responses.length; i++) {

                                        const response = responses[i];

                                        // if the last.fm user's playcount for this release isn't 0,
                                        // then we don't want to display it to them
                                        if (response.album.userplaycount !== '0') {
                                            
                                            // TODO: not the best solution, as am altering
                                            // the score to 0, and then resorting the list once
                                            // going through it all
                                            results[i].score = 0;
                                        }

                                    }

                                    results.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

                                    outerProgress.style.visibility = 'hidden';
                                    status.textContent = '';

                                    displayHelper(results);
                                });
                            } else {

                                outerProgress.style.visibility = 'hidden';
                                status.textContent = '';

                                displayHelper(results);
                            }
                        });


                    });
            });
        }    
}

function displayHelper(results) {
    // TODO: for now we will leave it at 50, hopefully set up some form
    // of pagination so they can view more than 50 results
    for (let i = 0; i < 50; i++) {
        displayRelease(results[i]);
    }
}

function displayRelease(album) {

    const html = document.getElementById('display-releases');

    const release = document.createElement('div');
    release.classList.add('col-3');
    release.style.align = 'center';

    const releaseText = document.createElement('p');
    releaseText.textContent = album.artist + ': ' + album.name + ' (score: ' + album.score + ' & playcount: ' + album.playcount + ')';
    release.appendChild(releaseText);

    const coverArt = document.createElement('img');
    coverArt.src = album.image;
    coverArt.style.height = '100px';
    coverArt.style.width = '100px';
    release.insertBefore(coverArt, releaseText);

    html.appendChild(release);
}