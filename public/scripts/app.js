$(() => {
  let usersCategories = {};

  refreshContent = () => {
    $('#lists-container').empty();
    renderContent();
  }
  
  renderContent();

  hideModalAndClear = (modalID, formID) => {
    $(modalID).modal('hide');
    $(formID).trigger('reset');
  }
  // HELPERS--------------------------
  // Build todo task elements
  const buildListTask = (taskObject, listID) => {
    const taskName = taskObject.name;
    const taskID = taskObject.id;
    let $cardBody = $('<div>').addClass('card-body')
                  .append($('<p>').text(taskName).addClass('task-name').attr('id',`${taskID}-${taskName}-${listID}-task`)
                  .click(editTaskModal));
    let $checkBox = $('<div>').addClass('complete-task')
                  .attr('id',`complete-${taskID}-${listID}`).click(completeTask).append($('<p>').addClass('checkmark').text('✔️'));
    let $task = $($cardBody).append($($checkBox));
    $(`#list-${listID}`).append($($task));
  }
  // AJAX call to get the todo tasks for a category
  const writeListItems = (categoryID) => {
    $.get(`/categories/${categoryID}/tasks`)
    .done((data) => {
      for (let task of data) {
        buildListTask(task, categoryID);
      }
    })
  }
  // Build list for a category (doesn't include items)
  const buildList = (listObject) => {
    const listName = listObject.name;
    const listID = listObject.id;
    let $cardContainer = $('<div>').addClass('card bg-light mb-3 side-scroll').attr('id', `list-${listID}`);
    let $cardHeader = $('<div>').addClass('card-header category-id').text(listName).attr('id', `${listID}-${listName}-header`).click(editCatModal);
    let $listElement = $($cardContainer).prepend($($cardHeader));
    $('#lists-container').append($listElement);
  }

  const addCategoryToTaskEditModal = (catName, catID) => {
    $('#edit-task-form select').append($('<option>').text(catName).val(Number(catID)));
  }
  // END HELPERS----------------------

  const checkForKeywords = (title) => {
    const keywords = {
      Read: ['read', 'book', 'study', 'learn', 'translate', 'view', 'album', 'booklet', 'magazine', 'novel', 'write', 'copy'],
    
      Watch: ['movie', 'cinema', 'film', 'show', 'video', 'watch',
      'see', 'series', 'netflix', 'TV', 'television', 'season', 'episode', 'episodes', 'series'],
    
      Eat: ['restaurants', 'bar', 'pub', 'cafe', 'coffee shop', 'bistro', 'hungry', 'eat', 'dinner', 'lunch', 'breakfast', 'brunch', 'snack', 'groceries', 'food', 'vending', 'salad'],
    
      Buy: ['buy', 'shopping', 'products', 'purchase', 'value', 'browse',
      'spend', 'brand', 'merchandise', 'clothing']
    };
    console.log("checking for keywords now...")
    let matchedCat = '';
    for (let category in keywords) {
      for (let word of keywords[category]) {
        if(title.toLowerCase().includes(word)) {
          matchedCat = category;
          return matchedCat;
        }
      }
    }
    // Returns nothing (undefined) if it doesn't match one
  };

  const genCategoriesList = (term, pages, cb) => {
    console.log(`generating categories list`);
    let matchingCategories = [];
    for (let page in pages) {
      let title = pages[page].title;
      // Check if there's a wikipedia page with the query in the title
      if ((title.toLowerCase()).includes(term.toLowerCase())) {
        let newCat = checkForKeywords(title);
        if (newCat) {
          if (!matchingCategories.includes(newCat)) {
            matchingCategories.push(checkForKeywords(title));
          }
        }
      } else {
        // Couldn't match an article title from wikipedia
      }
    }
    // If there's only 1 matching category, return that
    if (matchingCategories.length === 1) {
      console.log(`one category in list: ${matchingCategories[0]}`)
      return cb(matchingCategories, term);
    } else {
      console.log("about to run CB in genCategoriesList")
      console.log(`matching categories: `, matchingCategories);
      return cb(matchingCategories, term);
    }
  }

  // If there's more than one matching category, find the one that's most common
  const getBestCatMatch = (arr, term) => {
    let mostCommon;
    let mostOccurrences = 0;
    arr.forEach(function(x) {
      let occurrences = 1;
      arr.forEach(function (y) {
        if (x === y) {
          occurrences ++;
          return occurrences;
        }
      });
      if (occurrences > mostOccurrences) {
        mostCommon = x;
        mostOccurrences = occurrences;
      }
    });
    console.log(`mostCommon in getBestCat Match: ${mostCommon}`)
    postNewTask(term, mostCommon);
  }

  // Search Wikipedia API
  const searchWikipedia = (term) => {
    $.getJSON(`https://en.wikipedia.org/w/api.php?action=query&format=json&gsrlimit=15&generator=search&origin=*&gsrsearch=${term}`)
    .done((data) => {
      genCategoriesList(term, data.query.pages, getBestCatMatch);
    });
  }

  // Get category ID from the name
  const getCatID = (name) => {
    return usersCategories[name];
  }

  // Post new task
  const postNewTask = (name, categoryName) => {
    let catID = getCatID(categoryName);
    console.log(`Posting to this category: ${categoryName} with ID: ${catID}`);
    let data = {
      name: name,
      category_id: catID,
    }
    console.log(`about to post with this data: ${data}`)
    $.post(`/categories/${catID}/tasks/new`, data)
    .then(refreshContent());
  }

  // Event handler for create new task
  $("#save-task").on('click', function (event) {
    event.preventDefault();
    const toDoInput = $('#create-task-input').val();
    hideModalAndClear('#add-task-modal', '#add-task-form');
    // Check if there are any trigger words in the task name
    if (checkForKeywords(toDoInput)) {
      postNewTask(toDoInput, checkForKeywords(toDoInput));
    } else {
      console.log("Couldn't find keywords in the task name...")
      // If there aren't trigger words in the task name, use the Wiki API
      searchWikipedia(toDoInput);
    }
  });

  // Create a new category
  $('#new-category-form').on('submit', function (event) {
    event.preventDefault();
    let catName = $(this).serialize();
    $.post('/categories/new', catName)
    .then(hideModalAndClear('#add-category-modal', '#new-category-form'))
    .then(refreshContent());
  });

  // Edit category name
  $('#edit-category-form').on('submit', function (event) {
    event.preventDefault();
    let catName = $(this).serialize();
    let catID = $(this).attr('data-id');
    $.post(`/categories/${catID}/edit`, catName)
    .then(hideModalAndClear('#edit-category-modal', '#edit-category-form'))
    .then(refreshContent());
  });

  // Delete category
  $('#delete-category-form').on('click', function (event) {
    let catID = $(this).attr('data-id');
    $.post(`/categories/${catID}/delete`)
    .then(hideModalAndClear('#edit-category-modal', '#edit-category-form'))
    .then(refreshContent());
  });

  // Edit task name
  $('#edit-task-form').on('submit', function (event) {
    event.preventDefault();
    let data = $(this).serialize();
    let taskID = $(this).attr('data-task-id');
    let taskName = $(this).attr('data-task-name');
    let catID = $(this).attr('data-cat-id');
    if ($('#edit-task-name').val() === "") {
      // fix this if there's time
      $('#edit-task-name').val(taskName);
    }
    $('#default-category-option').val(catID);
    $.post(`/categories/${catID}/tasks/${taskID}/edit`, data)
    .then(hideModalAndClear('#edit-item-modal', '#edit-task-form'))
    .then(refreshContent());;
  });

  // Delete task
  $('#delete-task-form').on('click', function (event) {
    let taskID = $(this).attr('data-task-id');
    let catID = $(this).attr('data-cat-id');
    $.post(`/categories/${catID}/tasks/${taskID}/delete`)
    .then(hideModalAndClear('#edit-item-modal', '#edit-task-form'))
    .then(refreshContent());;
  });

  const fillCatList = (list) => {
    let id = list.id;
    let name = list.name;
    usersCategories[name] = id;
    return usersCategories;
  }

  // AJAX call to populate the dashboard with the user's lists and items:
  function renderContent() {
    $.get('/categories').done((data) => {
    for (let list of data) {
      fillCatList(list);
      addCategoryToTaskEditModal(list.name, list.id);
      buildList(list);
      writeListItems(list.id);
    }
  });
  }

  // To complete a task:
  function completeTask() {
    let taskID = (this.id).split('-')[1];
    let categoryID = (this.id).split('-')[2];
    $.post(`/categories/${categoryID}/tasks/${taskID}/edit`, {
      completed: true,
      category_id: 2,
    }, 'json').then(refreshContent());
  }

  // To trigger list category name edit modal:
  function editCatModal() {
    let categoryID = (this.id).split('-')[0];
    let categoryName = (this.id).split('-')[1];
    $('#edit-category-modal form').attr({
      "data-id": categoryID,
    });
    $('#delete-category-form').attr({
      "data-id": categoryID,
    });
    $('#edit-category-modal input').attr('placeholder', `Enter new name for ${categoryName}`).val(categoryName);
    $('#edit-category-modal').modal('show');
  }

  // To trigger task name edit modal:
  function editTaskModal() {
    let taskID = (this.id).split('-')[0];
    let taskName = (this.id).split('-')[1];
    let categoryID = (this.id).split('-')[2];
    $('#edit-task-form').attr({
      "data-task-id": taskID,
      "data-cat-id": categoryID,
      "data-task-name": taskName,
    });
    $('#delete-task-form').attr({
      "data-task-id": taskID,
      "data-cat-id": categoryID,
    });
    $('#edit-item-modal input').attr('placeholder', `Enter new name for ${taskName}`);
    $('#edit-item-modal').modal('show');
  }

  // MODALS---------------------------
  // Listen for clicks on task names
  $('div.card-body').click(editTaskModal);

  // Listen for clicks on header of todo list categories
  $('div.card-header').click(editCatModal);

  $('#add-task').click(function () {
    $('#add-task-modal').modal('show');
  });

  $('#add-category').click(function () {
    $('#add-category-modal').modal('show');
  });

  // END MODALS-----------------------
});
