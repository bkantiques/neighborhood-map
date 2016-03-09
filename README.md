# Neighborhood Map

This app finds neighborhoods based on a search term the user enters, then
finds, displays on a map, and retrieves information about the top-rated places
on Yelp in the neighborhood.

## Installation

Clone the GitHub repository, then use npm to install the node modules

```
git clone https://github.com/bkantiques/neighborhood-map.git
npm install
```

## Usage

Using the geolocation feature may require running the app on a local server.
Navigate to either the src or dist folder, depending on if you want to use production
code, and start a local server. An example of how to do this, if you have Python 3
installed on your computer and want to use port 8080:

```
python -m http.server:8080
```

Then to view the page you should be able to go to `http://localhost:8080` in your
browser.

The app only works with neighborhoods that are known to Google. Here is a selection 
of neighborhoods that work in testing: SoHo (good example of Flickr photos), Upper 
East Side, Upper West Side, Harlem, Park Slope, Bayside, Flushing, Fort Greene (all 
in New York City), Downtown Atlanta, Peoplestown (Atlanta), Encino, Hollywood Hills (LA),
Guildwood, Harbord Village (Toronto), Whitechapel, Marylebone (London), Trastevere, and
Quadraro (Rome).  

If you put in a neighborhood that Google does not know, you will get an error message.

The 'Use current location' button only gets results if you're in a neighborhood Google knows.
Many locations are not known to Google. One way to test- make sure you are runnning on a 
local server in the `src` directory. Put a breakpoint on line 245 of app.js, and when the 
breakpoint is reached, edit the `lat` and `lng` properties of the local variable `latlng`.
Some values that Google recognizes: `lat: 40.7869, lng: -73.9753`. It is also important to 
be in a browser that supports all the necessary features. Google Chrome and Firefox seem to 
work well.

## Build process

If you make changes in the `src` directory and want to build the `dist` directory, use
`grunt build`.

Runnning `grunt watch` automatically updates the stylesheet in the `src` directory,
`src/css/style.css` when the Sass stylesheet `src/css/style.scss` is saved.

The build process includes Sass processing, css and js concatenation and minification, and html processing.

## Features

When a user enters a search term and searches for a neighborhood, this app queries the Google
Places API for neighborhoods, then queries the Yelp API for places in that neighborhood. It
displays the places on a map using the Google Maps API, and searches the Flickr API for images
for each place. Many places do not return Flickr images. To demonstrate the functionality, if
you search for 'Soho' as your neighborhood, there should be 3 places returned with images you
can see- Chobani SoHo, McNally Jackson and Housing Works. Places can have different icons on
the map depending on category, and they bounce when you click on them. The app uses the Sammy.js
router to navigate between neighborhood selection and the neighborhood map. It uses local storage
to save the neighborhood you searched for and which view you were last in, and loads this information
when you return to the app.  It also uses the geolocation API to give users the option to search
based on your current location. This will only work if you are in a neighborhood that Google can
find a name for. You can filter the places by name or category. There is an autocomplete to help
with filtering.

## Issues

The app uses some javascript array operations that may not be supported in older
browsers, such as `Array.includes`. Also, some browsers prohibit geolocation on an
insecure site. The app has been tested and should work in Google Chrome or Firefox.