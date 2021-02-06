import { getInput, error, debug, info } from "@actions/core";
import { Client, MessageEmbed, TextChannel } from "discord.js";
import * as glob from "@actions/glob";
import { readFileSync } from "fs";
import matter from "gray-matter";
import { basename, extname, parse } from "path";
import { Color, truncate, wipeChannel } from "./util";

async function run() {
  const discordToken = getInput("discord_token");
  const discordChannel = getInput("discord_channel");
  const websiteBaseUrl = getInput("website_base_url");
  const slugReplacePath = getInput("slug_replace_path");

  const globber = await glob.create(getInput("faq_glob"), {
    omitBrokenSymbolicLinks: true,
  });
  const discordClient = new Client();
  const colors = new Color();
  const files = await globber.glob();

  const items = await Promise.all(
    files.map(async (file) => {
      const markdown = matter(readFileSync(file, "utf-8"));
      info(`Processing: ${file}`);

      const title: string =
        markdown.data.title || basename(file, extname(file));
      const path = parse(file.split("/").slice(6).join("/"));
      const readUrl = `${websiteBaseUrl}${path.dir.slice(
        slugReplacePath.length
      )}/${path.name}`;

      debug(`Read url for ${file} is at: ${readUrl}`);
      return {
        title,
        readUrl,
        description: [
          truncate(markdown.content, 1800, "..."),
          `📰 [Read more](${readUrl})`,
        ].join("\n\n"),
      } as const;
    })
  );

  const embeds = items.map(({ title, description, readUrl }) =>
    new MessageEmbed()
      .setTitle(title)
      .setDescription(description)
      .setURL(readUrl)
      .setColor(colors.next())
  );

  discordClient.once("ready", async () => {
    try {
      const channel = discordClient.channels.resolve(
        discordChannel
      ) as TextChannel;

      if (!(channel && channel.type === "text")) {
        throw new Error("Please provide a valid text channel.");
      }

      info(`Wiping channel: ${channel.name} in ${channel.guild.name}`);

      await wipeChannel(channel);

      info(`${channel.name} channel wiped`);

      const sentEmbeds = await Promise.all(
        embeds.map((embed) => channel.send(embed))
      );

      const messagePaths = sentEmbeds.map((message, index) => {
        const link = `https://discord.com/channels/${channel.guild.id}/${channel.id}/${message.id}`;
        const item = items[index];
        return {
          link,
          ...item,
        } as const;
      });

      info(`Wiki url is at: ${websiteBaseUrl}`);

      const messagePathIndice = messagePaths.reduce<string[]>(
        (pathIndice, item, index) => {
          pathIndice.push(`${index + 1}. [${item.title}](${item.link})`);
          return pathIndice;
        },
        []
      );

      const indexEmbed = new MessageEmbed()
        .setTitle("Discord FAQ")
        .setDescription(
          [
            "Here are several common questions asked in the server. Click on the link to go to the answer.\n",
            ...messagePathIndice,
          ].join("\n")
        )
        .setColor(colors.next())
        .setTimestamp();

      await channel.send(indexEmbed);

      await channel.send(
        `You can find our FAQs on the website here: ${websiteBaseUrl}`
      );
    } catch (e) {
      discordClient.destroy();
      error(e);
      process.exit(0);
    }

    discordClient.destroy();

    info(`Logging out...`);
  });

  discordClient.login(discordToken);
}

run().catch((err) => {
  error(err);
  process.exit(1);
});
