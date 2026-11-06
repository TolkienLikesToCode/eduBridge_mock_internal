(function () {
  var menu = document.getElementById('context-menu');
  var currentCell = null;

  document.addEventListener('contextmenu', function (e) {
    var td = e.target.closest('td');
    if (!td) return;
    e.preventDefault();
    currentCell = td;
    menu.hidden = false;
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
  });

  document.addEventListener('click', function () { menu.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.hidden = true; });

  menu.querySelectorAll('button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!currentCell) return;
      var action = btn.dataset.action;
      var value = currentCell.textContent;
      switch (action) {
        case 'copy':
          if (navigator.clipboard) navigator.clipboard.writeText(value);
          break;
        case 'copy-lkid':
          var lkidCell = currentCell.parentElement.querySelectorAll('td')[1];
          if (lkidCell && navigator.clipboard) navigator.clipboard.writeText(lkidCell.textContent);
          break;
        case 'filter': console.log('filter by', value); break;
        case 'sort-asc': console.log('sort asc by', currentCell.cellIndex); break;
        case 'sort-desc': console.log('sort desc by', currentCell.cellIndex); break;
        case 'inspect': console.log('inspect row', currentCell.parentElement.rowIndex); break;
      }
      menu.hidden = true;
    });
  });
})();