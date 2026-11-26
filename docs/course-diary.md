# Keep a course diary in Obsidian

Keep a question, a passage from the book and the observation that helped you answer it together.
One vault holds three folders, **Establish**, **Challenge** and **Compare**.
Each contains three lecture notes and a phase overview.
Return to the same lecture note to keep your prediction, saved passages and later reflections together.
At the end of each phase, use its overview to look back across the three lectures and choose what goes into your individual portfolio.

[Download the course diary (.zip)](/downloads/course-diary.zip)

## Start with the first lecture

1. Install [Obsidian](https://obsidian.md/download) and unzip the course diary somewhere private, outside your group's project repository.
2. In Obsidian, choose **Open folder as vault**.
   Select the extracted **Course diary** folder that contains **00-Start here.md**.
   A vault is simply a folder of notes.
   If Obsidian asks whether you trust the vault, choose **Browse vault in Restricted Mode** to start with the notes. [Open an existing folder in Obsidian](https://obsidian.md/help/vault)
3. Open **00-Start here** and follow the link to **Lecture 1**.
   You can also open **Establish → Lecture 1** from the file list.
   A team says its cached summary loads twice as fast.
   What would you measure before deciding to keep the cache?
   Write your prediction under the prompt.
   To open the reading inside desktop Obsidian, enable **Web viewer** under **Settings → Core plugins**, then turn on **Settings → Web viewer → Open external links**.
   Follow **Reading** under **Lecture 1** to open the chapter. [Obsidian Web viewer](https://obsidian.md/help/plugins/web-viewer)
4. After the lecture, reopen **Lecture 1** by name.
   Add the date, what you observed and how it affected your prediction.
   For an audio or video diary, keep the recording or a link beside the prompt with a short description.

Keep a backup of your diary folder and any recordings it refers to.
The notes also work in a plain text editor.
Choose the tools and diary format that suit you. [Course diary and participation criteria](/project/grading/#participation-and-learning-diary-3-points-per-lecture)

## Bring a passage into your diary

With the **Course diary** plugin enabled in your desktop vault, select the sentences you want on a book page and choose **Add book highlight** at the bottom of the page.
If your browser asks to open Obsidian, allow it.
Choose the lecture, review the quotation and source link, then choose **Save highlight**. [Enable the course plugin](#use-the-optional-course-plugin)

For manual paste, including in Restricted Mode, choose **Copy highlight** and paste the quote into your lecture entry.
Both actions keep a link back to the passage.
You can save private highlights while signed out.
Under the quote, add why you kept it or what you plan to check.

If you already wrote your initial thinking in Obsidian, select those words in your saved note, right-click and choose **Use as my initial thinking**.
Review the book passage and choose **Open class discussion**.
Only the reference to your saved attempt travels with you.
If you start from the book, open the comment control beside the paragraph, choose **Discuss with classmates** and save your initial thinking with the standalone companion.
In either case, sign in to your course and choose **Reveal peer inquiry** to see threads for that reading.
You can reply or start a thread for your group or the course cohort.

To send feedback privately to the book team, use the same paragraph control.
When sign-in is needed, Obsidian’s desktop Web viewer opens the same paragraph in your default browser.
Sign in with GitHub there, write your feedback and choose **Post comment**.

To see your highlights again when you return to the original web page, you can turn on the Highlighter in Obsidian's optional Web Clipper browser extension.
The extension remembers highlighted passages in your browser and lets you save them to a note. [Web Clipper Highlighter](https://obsidian.md/help/web-clipper/highlight)

## Use the optional course plugin

The starter includes the **Course diary** plugin for desktop Obsidian.
To use it, open **Settings → Community plugins**, choose **Exit Restricted mode** (called **Turn on community plugins** in earlier versions), then enable **Course diary** under **Installed plugins**.
You can add highlights directly from the book.
To find the commands inside Obsidian, open the command palette with **Ctrl+P** or **Cmd+P** and search for **Course diary**. [Obsidian's community plugin settings](https://obsidian.md/help/community-plugins)

| Command                    | When to use it                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Open lecture diary         | Jump to the lecture you are studying.                                                                                        |
| Add book highlight         | After copying a highlight in the book, choose its lecture, review the quote and confirm.                                     |
| Discuss with the course TA | Review the excerpt or question you want to bring to the reading's assistant.                                                 |
| Use as my initial thinking | Use a saved selection for the initial step in a class discussion.                                                            |
| Prepare portfolio excerpt  | Select text in a lecture note and review what will go into that phase’s private draft, such as **Portfolio - Establish.md**. |

### Use the lecture folders in an existing vault

Unzip the course diary outside your vault.
Copy **Establish**, **Challenge** and **Compare** into your vault root, keeping any files you already have with the same name.
Copy **00-Start here** and **04-Portfolio** to the vault root for direct links to all nine lectures.

To enable the course commands for the first time, copy the starter’s `.obsidian/plugins/scalableweb-course-diary/` folder into the same location in your vault.
Show hidden files if needed, reopen the vault and enable **Course diary**.
If you already use the plugin, [update it](#update-the-course-plugin-in-an-existing-vault) to use its commands with the new lecture folders.

### Update the course plugin in an existing vault

[Download Course diary plugin 0.4.0 (.zip)](/downloads/course-diary-plugin-0.4.0.zip) and unzip it outside your vault.
Close Obsidian.
In your vault’s `.obsidian/plugins/scalableweb-course-diary/` folder, replace just `main.js` and `manifest.json` with the two files from the download.
Reopen the vault and check the version of **Course diary** under **Settings → Community plugins**.

## Discuss a question with the TA

With the desktop plugin, select a few lines of your diary, right-click and choose **Discuss with the course TA**.
Review the excerpt and add your question, for example, “Would my measurement catch slow cache misses?”
Choose **Use Obsidian TA** to run the assistant on this computer while the vault is open.
The first time, enter the ID of a Chat Completions model available to your account and your OpenAI API key.
The plugin uses Obsidian’s secret storage for the key.
Review the reading address and choose **Start TA and open reading**.
Use that reading in Chrome on the same computer.
Choose **Connect to Obsidian** and allow local network access if asked.
Paste the reviewed text and choose **Send message** when ready.
Your provider bills API usage.
You can choose **Stop Obsidian TA** in the command palette when finished.
The same vault and book website reopen their previous TA conversations on this computer.
Moving the vault or switching between a preview and the published site opens a separate conversation history.

If you use another editor, prefer another provider or want to reopen conversations saved with the standalone companion, use [the standalone setup](/notebook/setup/#start-on-your-computer).
Open the reading in Chrome on the companion’s computer and choose **Teaching assistant → Discuss**.
The plugin’s **Copy and open beside diary** and **Copy and open in default browser** actions also work with your existing companion.

Back in your lecture entry, record which part of your explanation changed and what you will try next.
Identify any assistant wording you keep.

## Prepare material for your portfolio

1. Open **04-Portfolio** and choose a phase.
   Its table maps the course lectures to the phase's three portfolio entries.
   Select a passage or recording from each entry you want to include.
   Check what the phase requires for participation, self-assessment, feedback and a decision you influenced. [Assessment rubric](/project/grading/)
2. Sign in to the [course workspace](/course/), select your course and phase, then open **My portfolio**.
   Paste your chosen excerpts into the matching fields.
   For written, audio or video files, choose **Attach written, audio or video evidence**, select the uploaded attachment and explain its relevance.
   Use links that staff can open outside your vault.
3. Check the material and choose **Submit portfolio** by the announced deadline.
   Check the displayed status. **Save draft** leaves the portfolio in draft.
   Course staff can access saved drafts and uploaded files.
   Keep private entries and confidential peer feedback out of the group's shared technical submission.

## Bring over an existing Notebook

If you wrote in the book's earlier Notebook, open [Notebook recovery](/notebook/setup/?legacy=1) in Chrome with your original companion running.
Choose **Connect companion** and then **Download previous notes as Markdown**.
Move the file into your vault.
It contains the latest text of every entry and its source link.
You can copy passages from that file into the matching lecture notes.

For a private backup with earlier revisions and concept judgments, choose **Export notebook backup** and keep the JSON file. [Companion backup and transfer](/notebook/setup/#keep-your-work-portable)
