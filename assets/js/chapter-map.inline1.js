
document.querySelectorAll('.chap h2').forEach(h=>{
 h.style.cursor='pointer';
 h.onclick=()=>{const t=h.parentElement.querySelector('.qlist');if(t)t.style.display=t.style.display==='none'?'':'none';};
});

/* 折叠/展开全部题目（原内联 onclick，改为 addEventListener） */
var toggleAllBtn = document.getElementById('toggleAll');
if (toggleAllBtn) {
  toggleAllBtn.addEventListener('click', function () {
    document.querySelectorAll('.qlist').forEach(function (t) {
      t.style.display = t.style.display === 'none' ? '' : 'none';
    });
  });
}
