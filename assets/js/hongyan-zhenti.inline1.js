
(function(){
  var cards = [].slice.call(document.querySelectorAll('.zt-card'));
  var fy = document.getElementById('f-year'),
      ft = document.getElementById('f-type'),
      fp = document.getElementById('f-prov'),
      fk = document.getElementById('f-key'),
      cnt = document.getElementById('zt-count'),
      empty = document.getElementById('zt-empty');
  if(!fy || !cards.length) return;
  function apply(){
    var y = fy.value, t = ft.value, p = fp.value,
        k = (fk.value || '').trim().toLowerCase(), n = 0;
    cards.forEach(function(c){
      var ok = (!y || c.getAttribute('data-year') === y)
            && (!t || c.getAttribute('data-type') === t)
            && (!p || c.getAttribute('data-prov') === p)
            && (!k || c.textContent.toLowerCase().indexOf(k) >= 0);
      c.style.display = ok ? '' : 'none';
      if(ok) n++;
    });
    if(cnt) cnt.innerHTML = '共 <b>' + n + '</b> / ' + cards.length + ' 题';
    if(empty) empty.style.display = n ? 'none' : '';
  }
  [fy, ft, fp].forEach(function(el){ el.addEventListener('change', apply); });
  if(fk) fk.addEventListener('input', apply);
  var rs = document.getElementById('f-reset');
  if(rs) rs.addEventListener('click', function(){
    fy.value = ''; ft.value = ''; fp.value = ''; fk.value = ''; apply();
  });
  apply();
})();
