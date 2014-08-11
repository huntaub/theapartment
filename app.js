var theApartment = angular.module('theApartment', [
  'ngRoute',
  'theApartmentControllers',
  'firebase',
]);

var theApartmentFirebase = new Firebase("https://theapartment.firebaseio.com");

theApartment.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider
      .when('/login', {
        templateUrl: 'partials/login.html',
        controller: 'LoginCtrl',
      })
      .when('/dashboard', {
        templateUrl: 'partials/dashboard.html',
        controller: 'DashboardCtrl',
      })
      .when('/meals', {
        templateUrl: 'partials/meals.html',
        controller: 'MealsCtrl',
      })
      .when('/receipts', {
        templateUrl: 'partials/receipts.html',
        controller: 'ReceiptsCtrl',
      })
      .otherwise({
        redirectTo:'/login',
      })
}]);

theApartment.directive('float', function(){
    return {
        require: 'ngModel',
        link: function(scope, ele, attr, ctrl){
            ctrl.$parsers.unshift(function(viewValue){
                return parseFloat(viewValue, 10);
            });
        }
    };
});
