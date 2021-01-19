$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedArticles = $("#favorited-articles")
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navNewStory = $("#nav-new-story");
  const $navFavorites = $("#nav-favorites");
  const $navMyStories = $("#nav-my-stories");
  const $body = $("body");
  $navNewStory.hide();
  $navFavorites.hide()
  $navMyStories.hide();

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $loginForm.find("#login-username").val();
    const password = $loginForm.find("#login-password").val();

    // call the login static method to build a user instance
    currentUser = await User.login(username, password);
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    const name = $createAccountForm.find("#create-account-name").val();
    const username = $createAccountForm.find("#create-account-username").val();
    const password = $createAccountForm.find("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    currentUser = await User.create(username, password, name);
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $body.on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.slideToggle();
  });

  /**
   * My Stories List Functionality
   */

  getMyStoriesList = async (user) => {
    $ownStories.empty();
    user.ownStories.forEach((story) => {
      const result = generateStoryHTML(story);
      $ownStories.append(result);
    })
  }

  /**
   * My Favorite Stories List Functionality
   */

  getMyFavoriteStoriesList = async (user) => {
    $favoritedArticles.empty();
    user.favorites.forEach((story) => {
      const result = generateStoryHTML(story);
      $favoritedArticles.append(result);
    })
  }

  /**
   * Add Favorite Story Functionality
   */

  addFavoriteStory = async (storyId) => {
    const response = await User.addFavorite(currentUser, storyId);
    currentUser.favorites = response.data.user.favorites.reverse();
  }

  /**
   * Remove Favorite Story Functionality
   */

  removeFavoriteStory = async (storyId) => {
    const response = await User.removeFavorite(currentUser, storyId);
    currentUser.favorites = response.data.user.favorites.reverse();
  }

  /**
   * Remove Story Functionality
   */

  removeStory = async (storyId) => {
    await User.removeStory(currentUser, storyId);
    await updateUser();
    await generateStories();
    await getMyFavoriteStoriesList(currentUser);
    await getMyStoriesList(currentUser);
  }

  /**
   * Event handler for Navigation to My Stories
   */

  $body.on("click", "#nav-my-stories", async function() {
    hideElements();
    await getMyStoriesList(currentUser);
    $ownStories.slideToggle();
  });

  /**
   * Event handler for Navigation to Favorites
   */

  $body.on("click", "#nav-favorites", async function() {
    hideElements();
    await getMyFavoriteStoriesList(currentUser);
    $favoritedArticles.slideToggle();
  });

  /**
   * Event handler for Navigation to New Story
   */

  $body.on("click", "#nav-new-story", async function() {
    hideElements();
    $submitForm.slideToggle();
  });

  /**
   * Handle submit form to create new Story and refresh the stories list
   */

  $submitForm.submit( async (e) => {
      e.preventDefault();
      let storyData = {};
      const formArray = $submitForm.serializeArray()
      formArray.forEach((dict) => {
        storyData[dict.name] = dict.value
      })

      const response = await StoryList.addStory(currentUser, storyData);

      await updateUser();
      generateStoryHTML(response);
      $submitForm.toggle();
      await generateStories();
      $allStoriesList.slideToggle();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    await updateUser();

    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * Function to update currentUser
   */
  async function updateUser() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    if(token && username) {
      currentUser = await User.getLoggedInUser(token, username);
    }
  }
  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    storyList = await StoryList.getStories();
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  $body.on('click', ".favorite", function(e) {
    const $targetElement = $(e.target);
    const storyId = e.target.parentElement.id;

    if ($targetElement.hasClass('far')) {
      addFavoriteStory(storyId);
      $targetElement.removeClass('far').addClass('fas');
    } else {
      removeFavoriteStory(storyId);
      $targetElement.removeClass('fas').addClass('far');
    }
    $favoritedArticles.empty();
  })

  $body.on('click', ".trash-can", async function(e) {
    const storyId = e.target.parentElement.id;
    await removeStory(storyId);
  })

  /**
   * A function to return trash can symbol or not
   */

  function buildTrashCanIcon(myStoriesIds, story) {
      if (myStoriesIds.includes(story.storyId)) {
        return `<i class="fa fa-trash trash-can"></i>`;
      } else {
        return '';
      }
  }

  /**
   * A function to return the favorite icon type
   */

  function buildFavoriteIcon(favoritesIds, story) {
    if(favoritesIds.includes(story.storyId)) {
      return `<i class="fa-star fas favorite"></i>`;
    } else {
      return `<i class="fa-star far favorite"></i>`;
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    // render story markup according to story in favorites or not
    const favoritesIds = currentUser.favorites.map((favorite) => {
      return favorite.storyId;
    })
    const myStoriesIds = currentUser.ownStories.map((myStories) => {
      return myStories.storyId;
    })
    return $(`
      <li id="${story.storyId}">
      ${buildFavoriteIcon(favoritesIds, story)}
      ${buildTrashCanIcon(myStoriesIds, story)}
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $favoritedArticles,
      $loginForm,
      $createAccountForm,
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    const elementsArr = [
      $navLogOut,
      $navNewStory,
      $navFavorites,
      $navMyStories,
    ];
    elementsArr.forEach($elem => $elem.show())
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
