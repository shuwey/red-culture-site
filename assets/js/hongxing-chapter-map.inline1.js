
document.querySelectorAll('.chap h2').forEach(h=>{
 h.style.cursor='pointer';
 h.onclick=()=>{const t=h.parentElement.querySelector('.qlist');if(t)t.style.display=t.style.display==='none'?'':'none';};
});
