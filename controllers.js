
var theApartmentControllers = angular.module('theApartmentControllers', []);

theApartmentControllers.controller('ApplicationCtrl', ['$scope', '$firebaseSimpleLogin', '$location',
  function($scope, $firebaseSimpleLogin, $location) {
    $scope.loginObj = $firebaseSimpleLogin(theApartmentFirebase);
    $scope.$on('$firebaseSimpleLogin:logout', function(e) {
      $location.path("/login");
    });
}]);
theApartmentControllers.controller('LoginCtrl', ['$scope', '$firebaseSimpleLogin', '$location',
  function($scope, $firebaseSimpleLogin, $location) {
    $scope.loginObj = $firebaseSimpleLogin(theApartmentFirebase);

    $scope.loginObj.$getCurrentUser().then(function(user) {
      if (user !== null) {
          $location.path("/dashboard");
      }
    }, function() {});

    $scope.login = function() {
      $scope.loginObj.$login("password", {
        email: $scope.username,
        password: $scope.password
      }).then(function(user) {
        $location.path("/dashboard");
      }, function(error) {
        $scope.error = error;
      });
    }
}]);
theApartmentControllers.controller('DashboardCtrl', ['$scope', '$firebaseSimpleLogin', '$firebase',
  function($scope, $firebaseSimpleLogin, $firebase) {
    $scope.loginObj = $firebaseSimpleLogin(theApartmentFirebase);

    $scope.fb = $firebase(theApartmentFirebase);

    $scope.resolveName = function(name) {
      return $scope.fb.users[name].name
    }

    $scope.groceries = $scope.fb.$child("groceries");
    $scope.addGrocery = function() {
      $scope.groceries.$add({
        name: $scope.newGrocery,
      });
      $scope.newGrocery = "";
    }

    $scope.receipts = $firebase(theApartmentFirebase).$child("receipts");

    var yourCosts = {};
    var totalCosts = {};

    $scope.totals = function(type) {
      var object = totalCosts;
      if (type == 0) {
        object = yourCosts;
      }

      var t = 0.0;
      for(var i in object) {
        t += object[i];
      }

      return t.toFixed(2);
    }

    $scope.yourCost = function(id, receipt) {
      total = 0.0;
      for(var i in receipt.items) {
        if(receipt.items[i].users[$scope.loginObj.user.uid] === true) {
          total += (receipt.items[i].cost / Object.keys(receipt.items[i].users).length);
        }
      }
      yourCosts[id] = total;
      return total.toFixed(2);
    }
    $scope.totalCost = function(id, receipt) {
      total = 0.0;
      for(var i in receipt.items) {
        total += receipt.items[i].cost;
      }
      totalCosts[id] = total;
      return total.toFixed(2);
    }

    var owed = {};

    function calculateOwed() {
      // Setup Owed Object
      for (var i in $scope.fb.users) {
        owed[i] = {};
        for (var k in $scope.fb.users) {
          owed[i][k] = 0.0;
        }
      }

      // Loop through Items - "Flat Owed"
      for(var i in $scope.fb.receipts) {
        var receipt = $scope.fb.receipts[i];
        for(var k in receipt.items) {
          var item = receipt.items[k];
          for(var j in item.users) {
            owed[j][receipt.payer] += (item.cost / Object.keys(item.users).length)
          }
        }
      }

      // Loop Through Owed, Cancel Debts
      for(var i in owed) {
        for(var k in owed) {
          if(i == k) { continue; }
          if(owed[i][k] != 0 && owed[k][i] != 0) {
            if(owed[i][k] > owed[k][i]) {
              owed[i][k] -= owed[k][i];
              owed[k][i] = 0;
            } else {
              owed[k][i] -= owed[i][k];
              owed[i][k] = 0;
            }
          }
        }
      }

      // Loop Through Owed, Transfer Debts
      for(var i in owed) {
        for(var k in owed) {
          for (var j in owed) {
            if(i == k || k == j || i == j) { continue; }
            if(owed[i][k] != 0 && owed[k][j] != 0) {
              if(owed[k][j] > owed[i][k]) {
                var temp = owed[i][k];
                owed[i][k] = 0;
                owed[i][j] += temp;
                owed[k][j] -= temp;
              }
            }
          }
        }
      }
    }

    $scope.totalOwed = function() {
      if(Object.keys(owed).length === 0) {
        calculateOwed();
      }

      var total = 0.0
      for(var i in owed[$scope.loginObj.user.uid]) {
        total += owed[$scope.loginObj.user.uid][i]
      }
      return total.toFixed(2);
    }

    $scope.calculateOwed = function(id) {
      if(id == $scope.loginObj.user.uid) {
        return "Can't owe yourself.";
      }

      if(Object.keys(owed).length === 0) {
        calculateOwed();
      }

      return owed[$scope.loginObj.user.uid][id].toFixed(2);
    }


    $scope.meals = $scope.fb.$child("meals");
}]);
theApartmentControllers.controller('MealsCtrl', ['$scope', '$firebase',
  function($scope, $firebase) {
    $firebase(theApartmentFirebase).$child("meals").$bind($scope, "meals");
}]);
theApartmentControllers.controller('ReceiptsCtrl', ['$scope', '$firebase', '$location',
  function($scope, $firebase, $location) {
    $scope.users = $firebase(theApartmentFirebase).$child("users");

    $scope.receipts = $firebase(theApartmentFirebase).$child("receipts");

    $scope.items = [
      {users: {}, cost:0.0},
    ];

    $scope.addItem = function() {
      $scope.items.push({users: {}, cost:0.0});
    }

    $scope.totalCost = function(rate) {
      if (arguments.length == 0) {
        rate = ($scope.taxed ? 1.05 : 1.00);
      }
      total = 0.0
      for(var i=0; i < $scope.items.length; i++) {
        total += ($scope.items[i].cost * rate);
      }
      return total.toFixed(2);
    }

    $scope.subtotal = function() { return $scope.totalCost(1.0); };
    $scope.tax = function() { return $scope.totalCost(0.05); };

    $scope.save = function() {
      var receipt = {
        name: $scope.name,
        payer: $scope.payer,
        items: $scope.items,
        taxed: $scope.taxed,
      }
      $scope.receipts.$add(receipt).then(function(ref) {
        $location.path("/dashboard");
      });
    }
}]);
