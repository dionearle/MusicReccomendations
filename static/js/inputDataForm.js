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

                        const topAlbumsPromises = []

                        // here we go through each friend and get their top albums,
                        // artists and tracks. we also use the time period as selected
                        // in the search parameters earlier

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
                        }

                        Promise.all(topAlbumsPromises)
                        .then(responses => {

                            let results = [];

                            for (let i = 0; i < responses.length; i++) {

                                const response = responses[i];

                                for (let i = 0; i < response.topalbums.album.length; i++) {

                                    let album = response.topalbums.album[i];

                                    // TODO: can also extract album art from this, which
                                    // will be helpful when displaying results to user

                                    let score = 51 - album['@attr'].rank;
                                    let name = album.name;
                                    let artist = album.artist.name;
                                    let playcount = parseInt(album.playcount);

                                    let found = false;

                                    for (let i = 0; i < results.length; i++) {
                                        if (results[i].name === name) {
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
                                            'playcount': playcount
                                        });
                                    }        
                                }
                            }    

                            // rank could also be decided by playcount, but then this favours users
                            // who listen to more music rather than the overall most popular music from
                            // your friends
                            results.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
                            //results.sort((a, b) => parseFloat(b.playcount) - parseFloat(a.playcount));
                            
                            console.log(results);
                        });


                    });
            });
        }    
}