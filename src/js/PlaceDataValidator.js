  // Module to check if neighborhood data is valid/ has all required info
  var PlaceDataValidator = (function(place) {
    var pv = {};

    // Check that name and url are valid
    pv.validStringProperties = function(place) {
      return typeof(place.name) === 'string' &&
      typeof(place.url) === 'string';
    };

    pv.validLocation = function(place) {
      return place.location &&
        place.location.address && typeof(place.location.address[0]) === 'string';
    };

    // Check if a variable is a valid latitude or longitude
    pv.validLatitude = function(coordinate) {
      return typeof(coordinate) === 'number' && coordinate >= -90 && coordinate <= 90;
    };

    pv.validLongitude = function(coordinate) {
      return typeof(coordinate) === 'number' && coordinate >= -180 && coordinate <= 180;
    };

    // Check if place has expected, valid coordinates
    pv.validCoordinate = function(place) {
      if(place.location && place.location.coordinate && place.location.coordinate && place.location.coordinate.latitude && place.location.coordinate.longitude) {
        var latitude = place.location.coordinate.latitude;
        var longitude = place.location.coordinate.longitude;

        return this.validLatitude(latitude) && this.validLongitude(longitude);
      }
      else {
        return false;
      }
    };

    // Check that rating is valid
    pv.validRating = function(place) {
      return typeof(place.rating) === "number" && place.rating >= 0 && place.rating <= 5;
    };

    // Check that categories array has at least 1 entry with a name and code
    pv.validCategories = function(place) {
      return place.categories && place.categories[0] && typeof(place.categories[0][0]) === 'string' && typeof(place.categories[0][1]) === 'string';
    };

    // Check that place has all required valid properties
    pv.validPlace = function(place) {
      return this.validStringProperties(place) &&
        this.validLocation(place) &&
        this.validRating(place) &&
        this.validCategories(place) &&
        this.validCoordinate(place);
    };

    return pv;
  })();