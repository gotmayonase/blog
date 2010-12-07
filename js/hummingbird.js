HummingbirdTracker = {};

HummingbirdTracker.track = function(env) {
  delete env.trackingServer;
  delete env.trackingServerSecure;
  env.u = document.location.href;
  env.bw = window.innerWidth;
  env.bh = window.innerHeight;
  if(document.cookie) {
      env.guid = (guid = document.cookie.match(/guid=([^\_]*)_([^;]*)/) ? guid[2] : null);
      env.gen = (gen = document.cookie.match(/gender=([^;]*);/) ? gen[1] : null);
      env.uid = (user_id = document.cookie.match(/user_id=([^\_]*)_([^;]*)/) ? user_id[2] : null);
    }
  if(document.referrer && document.referrer != "") {
    env.ref = document.referrer;
  }

  $('body').append('<img src="http://hummingbird.mikemayo.org:8000/tracking.gif?' + jQuery.param(env) + '"/>');
};