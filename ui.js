$(async function() {
  const $body = $("body");
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $favoritedStories = $("#favorited-articles");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");
  const $userProfile = $("#user-profile");

  let storyList = null;

  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successful, will set up the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault();

    const username = $("#login-username").val();
    const password = $("#login-password").val();

    currentUser = await User.login(username, password);
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successful, will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault();

    const name = $("#create-account-name").val();
    const username = $("#create-account-username").val();
    const password = $("#create-account-password").val();

    currentUser = await User.create(username, password, name);
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    localStorage.clear();
    location.reload();
  });

  /**
   * Submit article event handler.
   *
   * */

  $submitForm.on("submit", async function(evt) {
    evt.preventDefault();

    const title = $("#title").val();
    const url = $("#url").val();
    const hostName = getHostName(url);
    const author = $("#author").val();
    const username = currentUser.username

    const storyObject = await storyList.addStory(currentUser, {
      title,
      author,
      url,
      username
    });

    const $li = $(`
      <li id="${storyObject.storyId}" class="id-${storyObject.storyId}">
        <span class="star">
          <i class="far fa-star"></i>
        </span>
        <a class="article-link" href="${url}" target="a_blank">
          <strong>${title}</strong>
        </a>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-author">by ${author}</small>
        <small class="article-username">posted by ${username}</small>
      </li>
    `);
    $allStoriesList.prepend($li);

    // hide the form and reset it
    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");
  });

  $(".articles-container").on("click", ".star", async function(evt) {
    if (currentUser) {
      const $tgt = $(evt.target);
      const $closestLi = $tgt.closest("li");
      const storyId = $closestLi.attr("id");

      if ($tgt.hasClass("fas")) {
        await currentUser.removeFavorite(storyId);
        $tgt.closest("i").toggleClass("fas far");
      } else {
        await currentUser.addFavorite(storyId);
        $tgt.closest("i").toggleClass("fas far");
      }
    }
  });


  $navLogin.on("click", function() {
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });


  $navUserProfile.on("click", function() {
    hideElements();
    $userProfile.show();
  });

  $navSubmit.on("click", function() {
    if (currentUser) {
      hideElements();
      $allStoriesList.show();
      $submitForm.slideToggle();
    }
  });

  $body.on("click", "#nav-favorites", function() {
    hideElements();
    if (currentUser) {
      generateFaves();
      $favoritedStories.show();
    }
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $body.on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  $body.on("click", "#nav-my-stories", function() {
    hideElements();
    if (currentUser) {
      $userProfile.hide();
      generateMyStories();
      $ownStories.show();
    }
  });

  $ownStories.on("click", ".trash-can", async function(evt) {
    const $closestLi = $(evt.target).closest("li");
    const storyId = $closestLi.attr("id");

    await storyList.removeStory(currentUser, storyId);

    await generateStories();

    hideElements();

    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      generateProfile();
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    $loginForm.hide();
    $createAccountForm.hide();

    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    $allStoriesList.show();

    showNavForLoggedInUser();

    generateProfile();
  }


  function generateProfile() {
    $("#profile-name").text(`Name: ${currentUser.name}`);
    $("#profile-username").text(`Username: ${currentUser.username}`);
    $("#profile-account-date").text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
    $navUserProfile.text(`${currentUser.username}`);
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    storyList = await StoryList.getStories();
    $allStoriesList.empty();

    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A render method to render HTML for an individual Story instance
   * - story: an instance of Story
   * - isOwnStory: was the story posted by the current user
   */

  function generateStoryHTML(story, isOwnStory) {
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? "fas" : "far";

    const trashCanIcon = isOwnStory
      ? `<span class="trash-can">
          <i class="fas fa-trash-alt"></i>
        </span>`
      : "";

    return $(`
      <li id="${story.storyId}">
        ${trashCanIcon}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
          </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

  }

  function generateFaves() {
    $favoritedStories.empty();

    if (currentUser.favorites.length === 0) {
      $favoritedStories.append("<h5>No favorites added!</h5>");
    } else {
      for (let story of currentUser.favorites) {
        let favoriteHTML = generateStoryHTML(story, false, true);
        $favoritedStories.append(favoriteHTML);
      }
    }
  }

  function generateMyStories() {
    $ownStories.empty();

    if (currentUser.ownStories.length === 0) {
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else {
      for (let story of currentUser.ownStories) {
        let ownStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(ownStoryHTML);
      }
    }

    $ownStories.show();
  }


  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $userProfile,
      $favoritedStories,
      $loginForm,
      $createAccountForm,
      $userProfile
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $userProfile.hide();
    $(".main-nav-links, #user-profile").toggleClass("hidden");
    $navWelcome.show();
    $navLogOut.show();
  }


  function isFavorite(story) {
    let favStoryIds = new Set();
    if (currentUser) {
      favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
    }
    return favStoryIds.has(story.storyId);
  }

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


  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
