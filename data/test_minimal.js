(function(){
  if (window._test_loaded) return;
  window._test_loaded = true;
  console.clear();
  console.log('TEST LOADED [' + Date.now() + ']');
  window.TestScraper = {
    go: function() {
      console.log('GO [' + Date.now() + ']');
    }
  };
})();