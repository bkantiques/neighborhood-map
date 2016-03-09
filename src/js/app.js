$(document).ready(function() {



  // Neighborhood model
  var Neighborhood = function(neighborhood) {

    // Set neighborhood coordinates
    var viewport = neighborhood.geometry.viewport;
    var southWest = viewport.getSouthWest();
    var northEast = viewport.getNorthEast();

    this.minLatitude = southWest.lat();
    this.maxLatitude = northEast.lat();

    this.minLongitude = southWest.lng();
    this.maxLongitude = northEast.lng();

    // Set name and address
    this.name = neighborhood.name;
    this.formattedAddress = neighborhood.formatted_address;
  };

  // Place model- receives data from yelp and flickr
  var Place = function(place) {

    // self variable
    var placeSelf = this;

    // Load place properties from yelp data
    this.name = place.name;
    this.coordinate = place.location.coordinate;
    this.rating = place.rating;
    this.url = place.url;
    this.categories = [];

    this.address = place.location.address[0];

    // Phone and snippet text have fallback values in case data is missing
    this.phone = place.phone || 'No phone information';

    this. snippetText = place.snippet_text || 'No review snippet available';

    // Set categories
    place.categories.forEach(function(category) {
      placeSelf.categories.push({name: category[0], code: category[1]});
    });

    // Add observables for flickr photo url and potential error message
    this.flickrPhoto = ko.observable();
    this.flickrMessage = ko.observable();

  };

  // Map view
  var MapView = function() {

    var mv = {};


    // Initialize map and info window
    var initMapSettings = {
      center: new google.maps.LatLng(0, 0),
      zoom: 15
    };

    // Map object
    mv.map = new google.maps.Map(document.getElementById('map'), initMapSettings);

    // Info window
    mv.infowindow = new google.maps.InfoWindow({
      maxWidth: 250
    });

    // Sets map bounds to neighborhood bounds
    mv.setMapNeighborhood = function(neighborhood) {
        var neighborhoodLatLngBounds = {south: neighborhood.minLatitude,
          west: neighborhood.minLongitude,
          north: neighborhood.maxLatitude,
          east: neighborhood.maxLongitude};
        this.map.fitBounds(neighborhoodLatLngBounds);
    };

    // When a new place is selected, stop previous selection from bouncing
    mv.unsetSelectedPlace = function(place) {
      place.mapMarker.setAnimation(null);
    };

    // When a place is selected, sets info window content and opens info window on correct marker
    mv.setSelectedPlace = function(place) {
      place.mapMarker.setAnimation(google.maps.Animation.BOUNCE);

      this.infowindow.setContent('<div class="infowindow"><div>Name: ' + place.name + '</div>' +
        '<div>Category: ' + place.categories[0].name + '</div>' +
        '<div>Rating: ' + place.rating + '</div>' +
        '<div>Review snippet: ' + place.snippetText + '</div></div>');

      this.infowindow.open(this.map, place.mapMarker);
    };

    /*
    Finds specific icons for several types of businesses. Defaults to
    standard map icon
    */
    function getCategoryIcon(business) {
      var categories = business.categories;
      var iconPath = null;
      var i = 0;

      while(!iconPath && i < categories.length) {
        category = categories[i].code;
          if(category === 'pizza') {
            iconPath = 'pizza.png';
          }
          else if(category === 'italian') {
            iconPath = 'restaurant_italian.png';
          }
          else if(category === 'coffee') {
            iconPath = 'coffee.png';
          }
          else if(category === 'bakeries') {
            iconPath = 'bakery.png';
          }
          else if(category === 'barbers') {
            iconPath = 'barber.png';
          }
          else if(category === 'beer_and_wine' || category === 'bars') {
            iconPath = 'beer.png';
          }
        i++;
      }

      return iconPath;
    }

    // Create a marker for a place, then store the marker in the place object
    mv.createMarker = function(place) {

      var markerOptions = {
        position: {lat: place.coordinate.latitude, lng: place.coordinate.longitude},
        map: mv.map,
        title: place.name
      };

      var iconPath = getCategoryIcon(place);
      if(iconPath) {
        iconPath = 'images/map_icons/' + iconPath;
        markerOptions.icon = iconPath;
      }

      var marker = new google.maps.Marker(markerOptions);

      place.mapMarker = marker;
    };

    // If business does not pass filter, hide marker and close info window if needed
    mv.filterMarker = function(business, passesFilterBoolean) {
      var marker = business.mapMarker;

      if(passesFilterBoolean)
        marker.setVisible(true);
      else {
        marker.setVisible(false);
        if(business.isSelectedPlace()) {
          mv.infowindow.close();
        }
      }
    };

    // Remove markers from map and close info window- for use when new neighborhood is chosen
    mv.removeMarkers = function(places) {
      this.infowindow.close();

      for(var i = 0; i < places.length; i++) {
        var marker = places[i].mapMarker;
        marker.setMap(null);
      }
    };

    return mv;

  }();


  function ViewModel() {
    var self = this;

    // Variables to tewll which view is active
    self.neighborhoodSelectionViewActive = ko.observable(true);
    self.neighborhoodMapViewActive = ko.observable(false);

    // Search term and message for neighborhoods
    self.neighborhoodSearchTerm = ko.observable();
    self.neighborhoodSearchMessage = ko.observable();

    // Main data from neighborhood and places queries
    self.neighborhood = ko.observable();
    self.places = ko.observableArray();
    self.selectedPlace = ko.observable();

    // Error message that can appear on menu in map view
    self.placeSearchMessage = ko.observable();

    // Filtering term
    self.filterTerm = ko.observable('');

    // Autocomplete list and observables to control when autocomplete is visible
    self.autocompleteTerms = ko.observableArray();
    self.mouseOnAutocomplete = ko.observable(false);
    self.filterFieldHasFocus = ko.observable();

    // Controls if menu is hidden or visible on mobile (works with hamburger button)
    self.menuHiddenMobile = ko.observable(true);



    // Service for neighhborhood search
    var service = new google.maps.places.PlacesService(MapView.map);
    // Google goecoder
    var geocoder = new google.maps.Geocoder();

    // Get coordinates of current position
    self.getGeolocation = function() {
      // Clear old error message
      self.clearNeighborhoodErrorMessage();

      // If browser has geolocation, get the location. Else error message.
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(getNeighborhoodName, geolocationErrorMessage);
      } else {
          self.neighborhoodSearchMessage('Geolocation is not supported by this browser.');
      }
    };

    /*
    Figure out neighborhood address from coordinates of current position, then make the
    address the neighborhood search term and do a search
    */
    function getNeighborhoodName(position) {
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;

        var latlng = {lat: latitude, lng: longitude};

        geocoder.geocode({'location': latlng}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {

              var neighborhoodFound = false;

              for(var i = 0; i < results.length && !neighborhoodFound; i++) {
                var result = results[i];

                if(result.types && result.types.includes('neighborhood') && result.formatted_address) {
                  neighborhoodFound = true;
                  self.neighborhoodSearchTerm(result.formatted_address);
                  self.neighborhoodSearch();
                }
              }

              // If there is not a valid neighborhood name result, set error message
              if(!neighborhoodFound) {
                self.neighborhoodSearchMessage('Google could not find a named neighborhood for your location');
              }


            }
            else {
              self.neighborhoodSearchMessage('Could not find neighborhood for your location');
            }
          });
    }

    /*
    Error handler for a geolocation error- sets error message.
    Error messages based on example at http://www.w3schools.com/html/html5_geolocation.asp
    */
    function geolocationErrorMessage(error) {
      switch(error.code) {
        case error.PERMISSION_DENIED:
          self.neighborhoodSearchMessage("User denied the request for Geolocation.");
          break;
        case error.POSITION_UNAVAILABLE:
          self.neighborhoodSearchMessage("Location information is unavailable.");
          break;
        case error.TIMEOUT:
          self.neighborhoodSearchMessage("The request to get user location timed out.");
          break;
        case error.UNKNOWN_ERROR:
          self.neighborhoodSearchMessage("An unknown error occurred while getting your location.");
          break;
      }
    }

    // Search google places for a neighborhood using the neighborhood search term
    self.neighborhoodSearch = function() {
      var request = {query: self.neighborhoodSearchTerm(), types: ['neighborhood']};
      service.textSearch(request, self.neighborhoodSearchCallback);

      // Save search term to local storage
      self.saveNeighborhoodSearchTerm();
    };

    /*
    If neighborhoods are found in the google search, set neighborhood to first result,
    focus map there and search Yelp for locations in the neighborhood
    */
    self.neighborhoodSearchCallback = function(results, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {

        var neighborhoodData = results[0];

        // If neighborhood data is valid, set neighborhood

        if(NeighborhoodDataValidator.validNeighborhood(neighborhoodData)) {

          self.neighborhood(new Neighborhood(neighborhoodData));

          // Clear place search error message when new neighborhood found
          self.placeSearchMessage('');

          MapView.setMapNeighborhood(self.neighborhood());

          self.getYelp();

        }
        else {
          self.neighborhoodSearchMessage('No valid neighborhood found');
        }
      }
      else {
        self.neighborhoodSearchMessage('Neighborhood not found');
      }
    };

    // Clears selection view error message
    self.clearNeighborhoodErrorMessage = function() {
      self.neighborhoodSearchMessage('');
    };

    // Sets hash which triggers switch to map view
    self.switchToMapView = function() {
      location.hash = 'neighborhood-map';
    };

    // Sets hash which triggers switch to selection view
    self.switchToSelectionView = function() {
      location.hash = 'neighborhood-selection';
    };

    /*
    Search Yelp for top rated places within bounds of neighborhood
    */
    self.getYelp = function() {
      //OAuth stuff
      var auth = {
        //
        // Update with your auth tokens.
        //
        consumerKey: "44oJjV_MOKpCQDbKmumHRQ",
        consumerSecret: "XsOHFUWokDcd4jH3MXZsKkzKTpA",
        accessToken: "ytwKY1JLEXuVNksN854geugdAz9HiFjo",
        // This example is a proof of concept, for how to use the Yelp v2 API with javascript.
        // You wouldn't actually want to expose your access token secret like this in a real application.
        accessTokenSecret: "B_dljIo2u4h1nAn-YGG48KN44dY",
        serviceProvider: {
          signatureMethod: "HMAC-SHA1"
        }
      };

      var accessor = {
        consumerSecret: auth.consumerSecret,
        tokenSecret: auth.accessTokenSecret
      };

      parameters = [];
      parameters.push(['callback', 'cb']);
      parameters.push(['oauth_consumer_key', auth.consumerKey]);
      parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
      parameters.push(['oauth_token', auth.accessToken]);
      parameters.push(['oauth_signature_method', 'HMAC-SHA1']);

      var neighborhood = this.neighborhood();

      var message = {
        'action': 'http://api.yelp.com/v2/search?limit=10&sort=2&bounds=' + neighborhood.minLatitude + ',' + neighborhood.minLongitude + '|' + neighborhood.maxLatitude + ',' + neighborhood.maxLongitude,
        'method': 'GET',
        'parameters': parameters
      };
      OAuth.setTimestampAndNonce(message);
      OAuth.SignatureMethod.sign(message, accessor);
      var parameterMap = OAuth.getParameterMap(message.parameters);
      parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature);

      var yelpCallback = this.yelpCallback;

      $.ajax({
        'url': message.action,
        'data': parameterMap,
        'cache': true,
        'dataType': 'jsonp',
        'jsonpCallback': 'cb',
        'context': this,
        'success': yelpCallback,
        'timeout': 10000,
        'error': function() {
          /*
          Waits 10 seconds to print error message if yelp request fails- apparently
          when jsonp requests fail they do not trigger error functions unless there is
          a timeout in the request
          */
          this.neighborhoodSearchMessage('Error retrieving data from Yelp');
        }
      });
    };

    /*
    Store places retrieved from Yelp. Add some observables to each place for display and
    filtering purposes. Clear old data and map markers make a map marker for each new place.
    */
    self.yelpCallback = function(data) {
      if(data.businesses) {

        // Remove any old markers
        MapView.removeMarkers(self.places());

        var places = [];

        data.businesses.forEach(function(business, index) {

          if(PlaceDataValidator.validPlace(business)) {

            var place = new Place(business);

            // Create a marker for the business
            MapView.createMarker(place);

            // When marker is clicked, make place selected
            place.mapMarker.addListener('click', self.setSelectedPlace.bind(place));

            // Returns true if this place is the selected place
            place.isSelectedPlace = ko.computed(function() {
              return this === self.selectedPlace();
            }, place);



            // Returns true if business name or categories contain filter term
            place.passesFilter = ko.computed(function() {
              var filterTerm = self.filterTerm().toLowerCase().trim();

              var pass = false;
              var name = this.name.toLowerCase();
              var categories = this.categories;
              var marker = this.mapMarker;

              if(filterTerm === '') {
                pass = true;
              }
              else if(name.indexOf(filterTerm) != -1)
                pass = true;
              else {
                for(var i = 0; i < categories.length; i++) {
                  var category = categories[i].name.toLowerCase();
                  if(category.indexOf(filterTerm) != -1) {
                    pass = true;
                  }
                }
              }

              // Hide marker if doesn't pass filter
              MapView.filterMarker(this, pass);

              return pass;

            }, place);

            places.push(place);

          }

        });

        // Store Yelp places in observable array
        this.places(places);

        // If no places found, set error message
        if(places.length === 0) {
          self.placeSearchMessage('No places found in this neighborhood');
        }

        // Clear old autocomplete array then build with new data
        self.clearAutocompleteTerms();
        self.setAutocompleteTerms();

        // Display map view once all the data is prepared
        self.switchToMapView();

      }
    };

    // Set selected place
    self.setSelectedPlace = function() {

      // If there is already a different selected place, stop the bouncing animation
      if(self.selectedPlace() && !this.isSelectedPlace())
        MapView.unsetSelectedPlace(self.selectedPlace());

      MapView.setSelectedPlace(this);
      self.selectedPlace(this);

      self.getFlickr();
    };

    // Clear old autocomplete terms
    self.clearAutocompleteTerms = function() {
      self.autocompleteTerms([]);
    };

    // Go through places and add name sand categories to autocomplete terms list
    self.setAutocompleteTerms = function() {
      // Add categories to autocomplete list
      self.places().forEach(function(place) {
        if(place.categories && place.categories.length) {
          place.categories.forEach(function(category) {
            if(category.name) {
              self.createAutocompleteItem(category.name);
            }
          });
        }
      });

      // Add place names to autocomplete array
      self.places().forEach(function(place) {
        self.createAutocompleteItem(place.name);
      });

    };


    // Check if term is already in array
    function autocompleteMatches(autocompleteItem) {
      return autocompleteItem.term.toLowerCase().trim() === this.toLowerCase().trim();
    }

    var $filterField = $('filter-term');

    // Makes an autocomplete item if the term is not already in the autocomplete array
    self.createAutocompleteItem = function(term) {
      //If term is not already in array
      if(self.autocompleteTerms().findIndex(autocompleteMatches, term) == -1) {
        var autocompleteItem = {};
        autocompleteItem.term = term;

        // Returns true if the autocomplete item contains the filter term
        autocompleteItem.containsFilterTerm = ko.computed(function() {
          var lcAutocompleteTerm =  term.toLowerCase().trim();
          var lcFilterTerm = self.filterTerm().toLowerCase().trim();

          return lcAutocompleteTerm.indexOf(lcFilterTerm) != -1;
        }, autocompleteItem);

        // Sets filter term to clicked autocomplete term
        autocompleteItem.setFilterTerm = function(term, event) {
          self.filterTerm(this.term);
        };

        self.autocompleteTerms.push(autocompleteItem);
      }

    };

    // Set whether mouse is over autocomplete menu- autocomplete will stay open while beiong hovered over
    self.setMouseOnAutocomplete = function() {
      self.mouseOnAutocomplete(true);
    };

    self.unsetMouseOnAutocomplete = function() {
      self.mouseOnAutocomplete(false);
    };

    // Get flickr images of the place
    self.getFlickr = function() {

      var place = self.selectedPlace();

      // Get box coordinates to search within
      var neighborhood = self.neighborhood();

      var minLatitude = neighborhood.minLatitude;
      var maxLatitude = neighborhood.maxLatitude;
      var minLongitude = neighborhood.minLongitude;
      var maxLongitude = neighborhood.maxLongitude;

      /*
      Construct flickr request with neighborhood coordinates and name of selected place-
      sort by relevance and retrieve url of a 240px width image
      */
      // Encode place for use in flickr request
      var placeUrlName = encodeURIComponent(place.name);

      var flickrRequestUrl = 'https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=77a746b0c8b2484f233cb269061a8b21&extras=url_s,tags&sort=relevance&bbox=' + minLongitude + ',' + minLatitude + ',' + maxLongitude + ',' + maxLatitude + '&tags=' + placeUrlName;

      $.get(flickrRequestUrl, function(data) {

        // Collection of flickr photos
        var photos = data.getElementsByTagName("photo");

        // If photos found on flickr
        if(photos.length > 0) {
          // Take first photo and get url from flickr
          var photo = photos[0];

          var photoUrl = photo.getAttribute('url_s');

          if(photoUrl) {
            place.flickrPhoto(photoUrl);
          }
          else {
            // Error message- no photos found
            place.flickrMessage('No flickr photo url found');
          }


        }
        else {
          place.flickrMessage('No flickr photo found');
        }
      }).fail(function() {
        place.flickrMessage('Flickr photo request failed');
      });
    };

    /*
    Router - setting hash to '#neighborhood-selection' goes to selection view,
    setting hash to '#neighborhood-map' goes to map view
    */
    Sammy(function() {
      this.get('#neighborhood-selection', function() {
          self.neighborhoodMapViewActive(false);
          self.neighborhoodSelectionViewActive(true);

          // Save that map view is not active in local storage
          self.saveNeighborhoodMapViewActive();
      });

      this.get('#neighborhood-map', function() {
          self.neighborhoodSelectionViewActive(false);
          self.neighborhoodMapViewActive(true);

          // Save that map view is active in local storage
          self.saveNeighborhoodMapViewActive();
      });

      // If no hash, go to selection view
      this.get('', function() { this.app.runRoute('get', '#neighborhood-selection'); });
    }).run();

    // Shows or hides menu on mobile
    self.toggleMenuHiddenMobile = function() {
      self.menuHiddenMobile(!self.menuHiddenMobile());
    };

    // Functions for local storage and retrieval of user's state

    /*
    Check if browser has localStorage capability- code taken from
    https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
    */
    self.localStorageAvailable = function() {
      try {
        var storage = window.localStorage,
          x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
      }
      catch(e) {
        return false;
      }
    };

    // Store neighborhood search term
    self.saveNeighborhoodSearchTerm = function() {
      if(self.localStorageAvailable()) {
        localStorage.setItem('neighborhoodSearchTerm', self.neighborhoodSearchTerm());
      }
    };

    // Store whether app is in neighborhood selection view or map view mode
    self.saveNeighborhoodMapViewActive = function() {
      if(self.localStorageAvailable()) {
        localStorage.setItem('neighborhoodMapViewActive', self.neighborhoodMapViewActive());
      }
    };

    /*
    Load neighborhood search term and whether the map view was active from localStorage.
    If the map view was active, search for the search term- which will end up sending the
    app to the map view with the proper data.
    */
    self.load = function() {
      if(self.localStorageAvailable()) {
        // If neighborhood search term is in local storage, set it in the ViewModel
        var neighborhoodSearchTerm = localStorage.getItem('neighborhoodSearchTerm');
        if(neighborhoodSearchTerm) {
          self.neighborhoodSearchTerm(neighborhoodSearchTerm);

          var neighborhoodMapViewActive = localStorage.getItem('neighborhoodMapViewActive');

          // If neighborhood map view was active, do a neighborhood search to retrieve data
          if(neighborhoodMapViewActive === 'true') {
            self.neighborhoodSearch();
          }
        }
      }
    };

    // Try retrieving data from local storage on initialization
    self.load();

  }

  ko.applyBindings(new ViewModel());

});