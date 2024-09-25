const { chromium } = require("playwright"); // Import the Playwright library to use Chromium for browser automation.

(async () => {
  // Launch a new browser instance
  const browser = await chromium.launch({ headless: false }); // Launch a new browser instance with the 'headless' option set to false to see the browser window.
  const page = await browser.newPage(); // Create a new page in the browser.

  // Step 1: Navigate to Stack Overflow Questions Page
  console.log("Navigating to Stack Overflow Questions page...");
  await page.goto("https://stackoverflow.com/questions");

  // Accept cookies
  await page.getByRole('button', { name: 'Accept all cookies' }).click();

  // Step 2: Apply Filters
  console.log("Applying filters...");
  await page.getByRole("button", { name: "Filter" }).click(); // Click the "Filter" button.
  await page.getByRole("combobox", { name: "The following tags:" }).click(); // Click the "The following tags:" dropdown. 
  await page.getByRole("combobox", { name: "The following tags:" }).fill("javascript"); // Fill in the "The following tags:" field with "javascript".
  await page.getByRole('button', { name: 'Apply filter' }).click(); //  Click the "Apply filter" button.

  // Step 3: Extract Data for First 100 Questions
  let questionsData = []; //  Initialize an empty array to store the extracted questions data.
  let questionSelector = "div.s-post-summary--content"; //   Selector for the question elements.

  console.log("Starting to extract questions...");
  while (questionsData.length < 100) { ///  Loop to extract questions until we have 100 questions.
    // Wait for page to load new questions
    await page.waitForSelector(questionSelector, { timeout: 10000 }); // Wait for the question elements to be present on the page.

    // Extract question elements
    const questionElements = await page.$$(questionSelector); // Use Playwright's $$ function to select all elements matching the selector.

    for (let questionElement of questionElements) { // Loop through each question element.
      if (questionsData.length >= 100) // If we have 100 questions, exit the loop.
        break;

      // Title of the question
      const title = await questionElement.$eval("h3 > a", (el) =>
        el.textContent.trim(), // Extract the title of the question.
      );

      // Tags
      const tags = await questionElement.$$eval("a.post-tag", (els) =>
        els.map((el) => el.textContent.trim()), // Extract the tags associated with the question.
      );

      // Number of votes
      let votes = '0'; // Default to '0' if vote count is not found
      const voteElement = await questionElement.$('div.s-post-summary--stats-item__emphasized span.s-post-summary--stats-item-number');
      if (voteElement) { // Check if the vote element exists
        votes = await voteElement.evaluate(el => el.textContent.trim());
      }

      // Timestamp
      let timestamp = null; // Initialize timestamp to null
      const timestampElement = await questionElement.$("span.relativetime"); // Find the timestamp element
      if (timestampElement) { // Check if the timestamp element exists
        timestamp = await timestampElement.getAttribute("title"); //  Get the title attribute of the timestamp element
      }

      questionsData.push({ // Add the extracted data to the questionsData array.
        title,
        tags,
        votes: parseInt(votes, 10), // Convert votes to a number
        timestamp,
      });
    }

    // Step 5: Handle Pagination (if necessary)
    const nextPageButton = await page.$('a.s-pagination--item[rel="next"]'); // Find the next page button
    if (nextPageButton && questionsData.length < 100) { // Check if there is a next page and we haven't reached 100 questions.
      console.log("Navigating to the next page...");
      await Promise.all([ // Wait for both the click and the loading of the new questions
        nextPageButton.click(), // Click the next page button
        await page.waitForSelector("div.s-post-summary--content"), // Wait for the new questions to load
      ]);
    } else {  // If there is no next page or we have reached 100 questions, exit the loop.
      break;
    }
  }

  // Output the collected questions
  console.log("Extraction complete. Questions data:", questionsData);

  // Step 4: Validate Sorting and Tags
  let isSorted = true; // Initialize isSorted to true
  for (let i = 1; i < questionsData.length; i++) { /// Loop through the questionsData array.
    if (
      new Date(questionsData[i].timestamp) > new Date(questionsData[i - 1].timestamp) // Check if the current question's timestamp is greater than the previous question's timestamp.
    ) {
      isSorted = false; // If the questions are not sorted, set isSorted to false and exit the loop.
      break;
    }
  }
  console.log("Questions sorted correctly:", isSorted);

  let allTaggedWithJS = questionsData.every((q) =>
    q.tags.includes("javascript"), // Check if all questions have the "javascript" tag.
  );
  console.log('All questions have "javascript" tag:', allTaggedWithJS);

  await browser.close();
})();
