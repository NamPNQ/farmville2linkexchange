if (!Array.prototype.joinWith) {
    +function () {
        Array.prototype.joinWith = function (that, by, select, omit) {
            var together = [], length = 0;
            if (select) select.map(function (x) {
                select[x] = 1;
            });
            function fields(it) {
                var f = {}, k;
                for (k in it) {
                    if (!select) {
                        f[k] = 1;
                        continue;
                    }
                    if (omit ? !select[k] : select[k]) f[k] = 1;
                }
                return f;
            }

            function add(it) {
                var pkey = '.' + it[by], pobj = {};
                if (!together[pkey]) together[pkey] = pobj,
                    together[length++] = pobj;
                pobj = together[pkey];
                for (var k in fields(it))
                    pobj[k] = it[k];
            }

            this.map(add);
            that.map(add);
            return together;
        }
    }();
}
angular.module('NamPNQApp', ['facebook'])

    .config([
        'FacebookProvider',
        function (FacebookProvider) {
            var myAppId = '487238447975056';

            // You can set appId with setApp method
            // FacebookProvider.setAppId('myAppId');

            /**
             * After setting appId you need to initialize the module.
             * You can pass the appId on the init method as a shortcut too.
             */
            FacebookProvider.init(myAppId);

        }
    ])

    .controller('MainController', [
        '$scope', '$http',
        '$timeout',
        'Facebook',
        function ($scope, $http, $timeout, Facebook) {
            $scope.config = {app_id: '321574327904696', group_id: '670369662994797'};

            // Define user empty data :/
            $scope.user = {};

            // Defining user logged status
            $scope.logged = false;

            // And some fancy flags to display messages upon user status change
            $scope.byebye = false;
            $scope.salutation = false;

            /**
             * Watch for Facebook to be ready.
             * There's also the event that could be used
             */
            $scope.$watch(
                function () {
                    return Facebook.isReady();
                },
                function (newVal) {
                    if (newVal)
                        $scope.facebookReady = true;
                }
            );

            /**
             * IntentLogin
             */
            $scope.IntentLogin = function () {
                Facebook.getLoginStatus(function (response) {
                    if (response.status == 'connected') {
                        $scope.logged = true;
                        $scope.me();
                    }
                    else
                        $scope.login();
                });
            };

            /**
             * Login
             */
            $scope.login = function () {
                Facebook.login(function (response) {
                    if (response.status == 'connected') {
                        $scope.logged = true;
                        $scope.me();
                    }

                }, {scope: 'user_groups,publish_stream,read_stream'});
            };

            /**
             * me
             */
            $scope.me = function () {
                Facebook.api('/me', function (response) {
                    /**
                     * Using $scope.$apply since this happens outside angular framework.
                     */
                    $scope.$apply(function () {
                        $scope.user = response;
                    });

                });
                $scope.feedItemFromFacebook();

                //console.log(response);

            };
            $scope.feedItemPosted = function () {
                $http.get('/api/farmville2/me', {
                    params: { user_id: $scope.user.id || 'Anonymous' }
                }).success(function (data) {
                        data.forEach(function (item) {
                            item.posted = true;
                        })
                        $scope.my_items= $scope.my_items.joinWith(data, 'link');
                    })
            };
            //Feed Item From Facebook
            $scope.feedItemFromFacebook = function () {
                $scope.feeding = true;
                FB.api({
                    method: 'fql.query',
                    query: 'select strip_tags(action_links), attachment, permalink, post_id, created_time from stream where source_id=me() and app_id=' + $scope.config.app_id + ' and filter_key="owner"',
                    return_ssl_resources: 1
                }, function (response) {
                    $scope.$apply(function () {
                        $scope.my_items = response;
                        //Fix image
                        angular.forEach($scope.my_items, function (item) {
                            item.attachment.media[0].src = decodeURIComponent(/src=(.*)/g.exec(item.attachment.media[0].src)[1]);
                            item.link = item.action_links[0].href;
                            item.posted = false;
                        });
                        $scope.feeding = false;
                        $scope.feedItemPosted();
                        //$timeout($scope.feedItemFromFacebook, 15000);
                    });

                });

            };


            /**
             * Logout
             */
            $scope.logout = function () {
                Facebook.logout(function () {
                    $scope.$apply(function () {
                        $scope.user = {};
                        $scope.logged = false;
                    });
                });
            }

            /**
             * Taking approach of Events :D
             */
            $scope.$on('Facebook:statusChange', function (ev, data) {
                console.log('Status: ', data);
                if (data.status == 'connected') {
                    $scope.$apply(function () {
                        $scope.salutation = true;
                        $scope.byebye = false;
                    });
                } else {
                    $scope.$apply(function () {
                        $scope.salutation = false;
                        $scope.byebye = true;

                        // Dismiss byebye message after two seconds
                        $timeout(function () {
                            $scope.byebye = false;
                        }, 2000)
                    });
                }


            });

            //Post to group
            $scope.post_to_group = function (item) {
                FB.api("/" + $scope.config.group_id + "/feed", 'post', {
                        message: item.attachment.description,
                        picture: item.attachment.media[0].src,
                        link: item.action_links[0].href

                    }, function (response) {
                        if (!response || response.error) {
                            //alert('Error occured');
                            alertify.error("Error occured");
                        } else {
                            alertify.success("Success post to group");
                            //alert('Post ID: ' + response.id);
                        }
                    }
                )
                ;
                $http.post("/api/farmville2/item", { "message": item.attachment.description,
                        "picture": item.attachment.media[0].src,
                        "link": item.action_links[0].href, "user_id": $scope.user.id}
                )
                    .success(function (data, status, headers, config) {
                       item.posted=true;
                    }).error(function (data, status, headers, config) {
                        //$scope.status = status;
                    });

            };
            //Click Item
            $scope.click = function (item) {
                window.open(item.link, "", 'width=700,height=500,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=0,top=0');
                $http.put("/api/farmville2/item", {
                    "link": item.link,
                    "userid": $scope.user.id || 'Anonymous'})
                    .success(function (data, status, headers, config) {
                        alertify.success("Click success");
                    }).error(function (data, status, headers, config) {
                        //$scope.status = status;
                    });
            };
            $scope.getAllItems = function () {
                $http.get('/api/farmville2/item', {
                    params: { user_id: $scope.user.id || 'Anonymous' }
                }).success(function (response) {
                        alertify.success("Get all data success");
                        $scope.items = response;
                        //Fix create at
                        angular.forEach($scope.items, function (item) {
                            item.create_at = new Date(new Date(item.create_at).getTime() - 60000 * (new Date().getTimezoneOffset()));
                            item.time_ago = moment(item.create_at).fromNow();
                        });
                    }).error(function (data, status, headers, config) {
                        alertify.error("Get data failed");
                    });
            };
            $scope.getAllItems();


        }
    ])

/**
 * Just for debugging purposes.
 * Shows objects in a pretty way
 */
    .
    directive('debug', function () {
        return {
            restrict: 'E',
            scope: {
                expression: '=val'
            },
            template: '<pre>{{debug(expression)}}</pre>',
            link: function (scope) {
                // pretty-prints
                scope.debug = function (exp) {
                    return angular.toJson(exp, true);
                };
            }
        }
    })

;

