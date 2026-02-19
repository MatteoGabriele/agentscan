# AgentScan

Identifying potential automation patterns in GitHub accounts

I didn’t expect to build this website, but ended up creating it in a weekend after reading [this article](https://socket.dev/blog/ai-agent-lands-prs-in-major-oss-projects-targets-maintainers-via-cold-outreach) about open source projects being targeted by AI agents.

**This is an ongoing experiment**. It uses an opinionated scoring system to analyze public GitHub events and classify accounts as human, suspicious, or likely bot.
The results are indicators, not verdicts. There’s no AI involved, just event analysis looking for patterns that feel a little off.

<img width="657" height="832" alt="Screenshot 2026-02-16 at 21 14 29" src="https://github.com/user-attachments/assets/8a616904-6459-4fd9-9d8f-9284bf9d1e29" />

### Contribute
Feel free to contribute to the project!

The stack is a straightforward Nuxt app with a single API endpoint that fetches public data from the GitHub API.
To make things reusable, the core analysis logic lives in a separate package — you can check it out [here](https://github.com/MatteoGabriele/voight-kampff-test).

This repository mainly focuses on the UI and the GitHub API integration.


### Issues and features requests

Please drop an issue, if you find something that doesn't work, or have an idea for something that works better.

