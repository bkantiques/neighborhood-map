// Module to check if neighborhood data is valid/ has all required info
var NeighborhoodDataValidator = (function() {

  var nv = {};

  // Check if a variable is a valid latitude or longitude
  nv.validLatitude = function(coordinate) {
    return typeof(coordinate) === 'number' && coordinate >= -90 && coordinate <= 90;
  };

  nv.validLongitude = function(coordinate) {
    return typeof(coordinate) === 'number' && coordinate >= -180 && coordinate <= 180;
  };

  // Check if neighborhood object has valid coordinate boundaries
  nv.validCoordinates = function(neighborhood) {

    var isValid = true;

    // Check if neighborhood has necessary geometry properties
    if(neighborhood.geometry && neighborhood.geometry.viewport &&
      neighborhood.geometry.viewport.getSouthWest && neighborhood.geometry.viewport.getNorthEast &&
      neighborhood.geometry.viewport.getSouthWest().lat && neighborhood.geometry.viewport.getSouthWest().lng &&
      neighborhood.geometry.viewport.getNorthEast().lat && neighborhood.geometry.viewport.getNorthEast().lng) {

      var viewport = neighborhood.geometry.viewport;

      // Check if coordinates are valid
      var minLatitude = viewport.getSouthWest().lat();
      var maxLatitude = viewport.getNorthEast().lat();
      var minLongitude = viewport.getSouthWest().lng();
      var maxLongitude = viewport.getNorthEast().lng();

      if(!(this.validLatitude(minLatitude) && this.validLatitude(maxLatitude) &&
        this.validLongitude(minLongitude) && this.validLongitude(maxLongitude))) {
        isValid = false;
      }
    }
    else {
      isValid = false;
    }

    return isValid;
  };

  // Check that name and address are strings (as expected)
  nv.validNameAndAddress = function(neighborhood) {
    return typeof(neighborhood.name) === 'string' && typeof(neighborhood.formatted_address) === 'string';
  };

  // Check if neighborhood has valid, required properties
  nv.validNeighborhood = function(neighborhood) {
    return this.validCoordinates(neighborhood) && this.validNameAndAddress(neighborhood);
  };

  return nv;
})();