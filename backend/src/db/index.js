import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import bcrypt from 'bcryptjs';
import axios from 'axios';

// 下载并保存头像
async function downloadAndSaveAvatar(username) {
  try {
    const avatarDir = path.join(process.env.NODE_ENV === 'production' ? '/data/uploads/avatars' : 'uploads/avatars');
    await fsPromises.mkdir(avatarDir, { recursive: true });

    // 生成随机种子
    const randomSeed = Math.random().toString(36).substring(2, 15);
    
    // 生成文件名
    const fileName = `${username}-${Date.now()}.png`;
    const filePath = path.join(avatarDir, fileName);

    // 下载 DiceBear Bottts Neutral 头像
    const response = await axios({
      method: 'get',
      url: `https://api.dicebear.com/7.x/bottts-neutral/png?seed=${randomSeed}&size=200`,
      responseType: 'stream'
    });

    // 保存到本地文件
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(`/uploads/avatars/${fileName}`));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('下载头像失败:', error);
    return '/uploads/avatars/default.png';
  }
}

// 生成随机创建日期（2023年1月到2024年2月之间）
function getRandomCreatedAt() {
  const start = new Date('2023-01-01').getTime();
  const end = new Date('2024-02-08').getTime();
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime).toISOString();
}

// 默认用户数据
const defaultUsers = [
  {
    username: 'Leo',
    password: 'Leo1234',
    realName: 'Leonardo Mitchell',
    dateOfBirth: '1990-03-15',
    bio: 'Full-stack developer passionate about technology and innovation, focused on building excellent user experiences.'
  },
  {
    username: 'Kevin',
    password: 'Kevin1234',
    realName: 'Kevin Anderson',
    dateOfBirth: '1988-07-22',
    bio: 'Senior System Architect with a passion for distributed systems and cloud-native technologies.'
  },
  {
    username: 'Mia',
    password: 'Mia1234',
    realName: 'Mia Thompson',
    dateOfBirth: '1992-11-30',
    bio: 'UI/UX Designer pursuing minimalist yet sophisticated design aesthetics.'
  },
  {
    username: 'Joy',
    password: 'Joy1234',
    realName: 'Joy Williams',
    dateOfBirth: '1991-05-18',
    bio: 'Product Manager dedicated to transforming creative ideas into practical solutions.'
  },
  {
    username: 'Vita',
    password: 'Vita1234',
    realName: 'Vita Parker',
    dateOfBirth: '1993-09-25',
    bio: 'Frontend Expert passionate about exploring cutting-edge web technologies.'
  },
  {
    username: 'Tyne',
    password: 'Tyne1234',
    realName: 'Tyne Harrison',
    dateOfBirth: '1989-12-10',
    bio: 'Backend Engineer focused on high-performance server-side development.'
  },
  {
    username: 'Dewey',
    password: 'Dewey1234',
    realName: 'Dewey Cooper',
    dateOfBirth: '1987-04-05',
    bio: 'DevOps Engineer pursuing the perfect blend of automation and efficiency.'
  },
  {
    username: 'Cameron',
    password: 'Cameron1234',
    realName: 'Cameron Foster',
    dateOfBirth: '1994-08-20',
    bio: 'Full-stack Developer who loves trying new technologies and sharing technical experiences.'
  },
  {
    username: 'Karson',
    password: 'Karson1234',
    realName: 'Karson Blake',
    dateOfBirth: '1990-06-15',
    bio: 'Technical Lead specializing in team management and technical architecture design.'
  }
];

// 默认文章数据
const defaultArticles = [
  {
    title: 'Exploring the History of the Macintosh',
    content: `The Macintosh, or Mac, has revolutionized personal computing since its introduction in 1984. This iconic product line from Apple has consistently pushed the boundaries of technology and design, creating a legacy that spans nearly four decades.

The story of Mac begins with Steve Jobs and his vision for creating a computer that anyone could use. The original Macintosh 128K was unveiled on January 24, 1984, during Super Bowl XVIII, with the now-famous "1984" commercial directed by Ridley Scott. This groundbreaking advertisement, which cost $1.5 million to produce, portrayed Apple as the rebellious alternative to IBM's dominant but rigid computing paradigm.

The first Macintosh featured a 9-inch monochrome display, a Motorola 68000 processor running at 8 MHz, 128KB of RAM, and a 400KB floppy disk drive. While these specifications might seem modest by today's standards, the machine's graphical user interface and mouse-based interaction model were revolutionary for their time. The Macintosh was the first mass-market personal computer to popularize these now-ubiquitous features.

Throughout the late 1980s and early 1990s, the Mac lineup expanded with various models catering to different market segments. The Macintosh II, released in 1987, brought color display support and expandability to the platform. The PowerBook series, introduced in 1991, set new standards for laptop design with its palm rest and trackball placement.

However, Apple faced significant challenges in the mid-1990s. The transition to the PowerPC architecture, while technically impressive, couldn't keep pace with Intel's rapid advancement. The company's market share dwindled, and many predicted its demise. The turning point came with Steve Jobs' return to Apple in 1997 and the introduction of the iMac G3 in 1998.

The iMac G3's translucent, colorful design wasn't just about aesthetics; it represented a fundamental shift in how computers could be perceived - not as beige boxes for offices, but as personal expressions of creativity. This philosophy of merging technology with design would become a hallmark of Apple's approach to product development.

The Mac's evolution continued with several pivotal transitions. The switch to OS X (now macOS) in 2001 provided a modern, Unix-based foundation that remains at the core of Apple's operating systems today. The 2006 transition from PowerPC to Intel processors dramatically expanded the Mac's software ecosystem and performance capabilities.

Perhaps the most significant recent development is the introduction of Apple Silicon. The M1 chip, launched in 2020, marked the beginning of a new era in Mac history. This custom-designed ARM-based processor delivers unprecedented performance and energy efficiency, while maintaining the Mac's tradition of user-friendly operation and seamless integration with Apple's ecosystem.

The Mac's influence extends far beyond its market share. Its emphasis on typography and consistent user interface guidelines helped establish desktop publishing as a viable industry. The Mac's support for multimedia capabilities made it the preferred platform for creative professionals, a position it largely maintains today.

Looking ahead, the Mac continues to evolve while maintaining its core principles of user-friendly design and innovative technology. The integration of iOS features into macOS, the advancement of Apple Silicon, and the continued refinement of the user experience suggest that the Mac's influence on computing will persist well into the future.`,
    html_content: `<p>The Macintosh, or Mac, has revolutionized personal computing since its introduction in 1984. This iconic product line from Apple has consistently pushed the boundaries of technology and design, creating a legacy that spans nearly four decades.</p>

<h2>The Birth of Macintosh</h2>

<p>The story of Mac begins with Steve Jobs and his vision for creating a computer that anyone could use. The original Macintosh 128K was unveiled on January 24, 1984, during Super Bowl XVIII, with the now-famous "1984" commercial directed by Ridley Scott. This groundbreaking advertisement, which cost $1.5 million to produce, portrayed Apple as the rebellious alternative to IBM's dominant but rigid computing paradigm.</p>

<p>The first Macintosh featured a 9-inch monochrome display, a Motorola 68000 processor running at 8 MHz, 128KB of RAM, and a 400KB floppy disk drive. While these specifications might seem modest by today's standards, the machine's graphical user interface and mouse-based interaction model were revolutionary for their time. The Macintosh was the first mass-market personal computer to popularize these now-ubiquitous features.</p>

<h2>Evolution Through the Years</h2>

<p>Throughout the late 1980s and early 1990s, the Mac lineup expanded with various models catering to different market segments. The Macintosh II, released in 1987, brought color display support and expandability to the platform. The PowerBook series, introduced in 1991, set new standards for laptop design with its palm rest and trackball placement.</p>

<p>However, Apple faced significant challenges in the mid-1990s. The transition to the PowerPC architecture, while technically impressive, couldn't keep pace with Intel's rapid advancement. The company's market share dwindled, and many predicted its demise. The turning point came with Steve Jobs' return to Apple in 1997 and the introduction of the iMac G3 in 1998.</p>

<p>The iMac G3's translucent, colorful design wasn't just about aesthetics; it represented a fundamental shift in how computers could be perceived - not as beige boxes for offices, but as personal expressions of creativity. This philosophy of merging technology with design would become a hallmark of Apple's approach to product development.</p>

<p>The Mac's evolution continued with several pivotal transitions. The switch to OS X (now macOS) in 2001 provided a modern, Unix-based foundation that remains at the core of Apple's operating systems today. The 2006 transition from PowerPC to Intel processors dramatically expanded the Mac's software ecosystem and performance capabilities.</p>

<p>Perhaps the most significant recent development is the introduction of Apple Silicon. The M1 chip, launched in 2020, marked the beginning of a new era in Mac history. This custom-designed ARM-based processor delivers unprecedented performance and energy efficiency, while maintaining the Mac's tradition of user-friendly operation and seamless integration with Apple's ecosystem.</p>

<h2>Impact on Modern Computing</h2>

<p>The Mac's influence extends far beyond its market share. Its emphasis on typography and consistent user interface guidelines helped establish desktop publishing as a viable industry. The Mac's support for multimedia capabilities made it the preferred platform for creative professionals, a position it largely maintains today.</p>

<p>Looking ahead, the Mac continues to evolve while maintaining its core principles of user-friendly design and innovative technology. The integration of iOS features into macOS, the advancement of Apple Silicon, and the continued refinement of the user experience suggest that the Mac's influence on computing will persist well into the future.</p>`,
    image_url: 'https://images.unsplash.com/photo-1611262588019-db6cc2032da3?q=80&w=2874&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Technology', 'Apple', 'Computing History', 'Innovation'],
    author: 'Leo',
    published_at: '2024-01-15',
    created_at: '2024-01-15'
  },
  {
    title: 'Unveiling the Age of Monitoring',
    content: `In a world where technology continues to evolve at an exponential pace, constant monitoring has become an inescapable reality. From surveillance cameras on every corner to digital tracking embedded in our personal devices, the Age of Constant Monitoring has arrived.

The Rise of Digital Surveillance
In the last decade, advancements in artificial intelligence, big data, and cloud computing have enabled organizations to monitor individuals and environments on an unprecedented scale. Governments deploy smart city technologies to enhance public safety, while corporations analyze user data to deliver targeted advertisements. However, the rise of digital surveillance is not without its challenges. Critics argue that it creates a culture of overreach, where personal freedoms are increasingly restricted.

Benefits of Constant Monitoring
Despite privacy concerns, constant monitoring offers tangible benefits. In healthcare, wearable devices track vital signs, enabling early detection of potential health issues. Smart home systems provide convenience and energy efficiency, responding to our habits and needs in real-time. Public safety has also seen improvements, with law enforcement using predictive analytics to prevent crimes before they occur. Such applications highlight the potential for technology to enhance human life when used responsibly.

Ethical Implications and Privacy Concerns
The ethical implications of constant monitoring cannot be overstated. Who owns the data collected about us? How is it being used, and by whom? Without clear regulations, the potential for misuse is significant. Privacy advocates warn that without transparency and accountability, individuals may lose control over their personal information. The growing use of facial recognition technology, for example, has sparked debates about racial bias, false positives, and the erosion of anonymity.

Navigating the Future of Monitoring
As the Age of Constant Monitoring unfolds, finding a balance between innovation and privacy is paramount. Governments and organizations must work together to establish ethical guidelines, ensuring technology serves humanity rather than exploiting it. Public awareness and education are also crucial. By understanding the technologies that shape our lives, individuals can make informed decisions and advocate for policies that protect their rights.

In conclusion, constant monitoring is a double-edged sword. While it offers opportunities to improve our lives, it also poses significant challenges. The key lies in harnessing its potential responsibly, ensuring it aligns with societal values and ethical standards.`,
    html_content: `<p>In a world where technology continues to evolve at an exponential pace, constant monitoring has become an inescapable reality. From surveillance cameras on every corner to digital tracking embedded in our personal devices, the Age of Constant Monitoring has arrived.</p>

<h2>The Rise of Digital Surveillance</h2>
<p>In the last decade, advancements in artificial intelligence, big data, and cloud computing have enabled organizations to monitor individuals and environments on an unprecedented scale...</p>

<h2>Benefits of Constant Monitoring</h2>
<p>Despite privacy concerns, constant monitoring offers tangible benefits. In healthcare, wearable devices track vital signs...</p>

<h2>Ethical Implications and Privacy Concerns</h2>
<p>The ethical implications of constant monitoring cannot be overstated...</p>

<h2>Navigating the Future of Monitoring</h2>
<p>As the Age of Constant Monitoring unfolds, finding a balance between innovation and privacy is paramount...</p>`,
    image_url: 'https://images.unsplash.com/photo-1546803073-23568b8c98e6?q=80&w=2400&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Surveillance', 'Privacy', 'Technology', 'Ethics'],
    author: 'Kevin',
    published_at: '2024-02-10',
    created_at: '2024-02-10',
  },
  {
    title: 'The Ukraine War',
    content: `The Ukraine War has reshaped the geopolitical landscape, highlighting the fragility of international alliances and the resilience of nations under threat.

The Historical Context
The roots of the Ukraine War trace back to decades of geopolitical tensions between Russia and the West. Following the collapse of the Soviet Union in 1991, Ukraine gained independence, becoming a pivotal state situated between Russia and Europe. However, its strategic position and aspirations for closer ties with NATO and the European Union have been a source of contention with Russia.

The 2014 annexation of Crimea by Russia marked a turning point in this conflict. It was followed by the destabilization of Eastern Ukraine, with pro-Russian separatists declaring independence in regions like Donetsk and Luhansk. The situation escalated into a full-scale war in February 2022 when Russia launched a large-scale invasion of Ukraine.

The Human Cost of War
The Ukraine War has inflicted immense suffering on the civilian population. Cities like Mariupol and Kharkiv have been devastated by relentless bombings, forcing millions of people to flee their homes. According to the UN, the war has created one of the largest refugee crises in recent history, with neighboring countries like Poland and Romania bearing the brunt of the influx.

Despite the human tragedy, the Ukrainian people have shown remarkable resilience. Stories of everyday heroes, from civilians forming defense brigades to volunteers delivering essential supplies, have captured the world's attention.

The Role of International Allies
International response to the Ukraine War has been swift and multifaceted. Western nations have imposed severe economic sanctions on Russia, targeting its financial institutions, energy exports, and key industries. NATO has increased its military presence in Eastern Europe, while the U.S. and EU nations continue to supply Ukraine with advanced weaponry and financial aid.

However, the war has also exposed divisions within the global community. Countries in the Global South have faced pressure to take sides, with many emphasizing the need for diplomacy and neutrality to prevent a broader conflict.

The Future of Ukraine and Global Implications
As the war grinds on, questions about Ukraine's future and the broader global order persist. Will Ukraine emerge as a symbol of democratic resilience, or will the conflict further entrench regional instability? The outcome of this war could set a precedent for how nations address territorial disputes and authoritarian aggression.

In conclusion, the Ukraine War is a stark reminder of the fragility of peace in an interconnected world. Its resolution will require not just military strength but also diplomatic efforts and a commitment to rebuilding trust among nations.`,
    html_content: `<p>The Ukraine War has reshaped the geopolitical landscape, highlighting the fragility of international alliances and the resilience of nations under threat.</p>

<h2>The Historical Context</h2>
<p>The roots of the Ukraine War trace back to decades of geopolitical tensions between Russia and the West. Following the collapse of the Soviet Union in 1991, Ukraine gained independence, becoming a pivotal state situated between Russia and Europe...</p>

<h2>The Human Cost of War</h2>
<p>The Ukraine War has inflicted immense suffering on the civilian population. Cities like Mariupol and Kharkiv have been devastated by relentless bombings, forcing millions of people to flee their homes...</p>

<h2>The Role of International Allies</h2>
<p>International response to the Ukraine War has been swift and multifaceted. Western nations have imposed severe economic sanctions on Russia, targeting its financial institutions, energy exports, and key industries...</p>

<h2>The Future of Ukraine and Global Implications</h2>
<p>As the war grinds on, questions about Ukraine's future and the broader global order persist. Will Ukraine emerge as a symbol of democratic resilience, or will the conflict further entrench regional instability?...</p>`,
    image_url: 'https://images.unsplash.com/photo-1618425978252-43dae17654c7?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['War', 'Ukraine', 'Geopolitics', 'International Relations'],
    author: 'Mia',
    published_at: '2024-02-10',
    created_at: '2024-02-10',
  },
  {
    title: 'Journey to Mars',
    content: `The journey to Mars represents one of humanity’s most ambitious and awe-inspiring endeavors, pushing the boundaries of science, technology, and human exploration.

The Historical Context
The idea of traveling to Mars has fascinated scientists and visionaries for centuries. From early telescopic observations by Giovanni Schiaparelli in the 19th century to speculative science fiction like Ray Bradbury’s "The Martian Chronicles," Mars has captured humanity’s imagination. However, the real push toward Mars exploration began with the advent of the space age in the mid-20th century.

NASA’s Viking missions of the 1970s marked the first successful landings on the Martian surface, providing valuable data and captivating images of the red planet. Subsequent missions, such as the Mars rovers Spirit, Opportunity, and Curiosity, deepened our understanding of Mars, revealing evidence of ancient water flows and the potential for microbial life.

The Challenges of Martian Exploration
Reaching Mars is no small feat. The planet lies an average of 225 million kilometers from Earth, with a journey taking roughly 6-9 months one way. Astronauts face immense challenges, including prolonged exposure to radiation, the psychological toll of isolation, and the technical complexity of landing on and surviving in an alien environment.

Developing the necessary technology for a Mars mission requires innovation on an unprecedented scale. From advanced propulsion systems to life-support habitats, every aspect of the journey must be meticulously planned and rigorously tested.

The Role of International Collaboration
The journey to Mars is not just a technological challenge but also a collaborative effort that transcends national boundaries. Space agencies like NASA, ESA, Roscosmos, and private companies such as SpaceX are pooling resources, expertise, and visions to make Mars exploration a reality.

Elon Musk’s SpaceX has been particularly vocal about its plans to establish a sustainable human presence on Mars. By leveraging reusable rocket technology and bold engineering, SpaceX aims to reduce the cost of interplanetary travel and inspire a new generation of explorers.

The Future of Humanity on Mars
A successful mission to Mars could pave the way for humanity’s expansion into the solar system. Colonizing Mars would not only represent a triumph of human ingenuity but also offer a potential solution to challenges on Earth, such as overpopulation and resource scarcity.

However, establishing a human presence on Mars raises ethical and philosophical questions. How should we balance exploration with preservation? What responsibilities do we have toward potential Martian ecosystems, if they exist? These questions will shape humanity’s approach to the red planet in the decades to come.

In conclusion, the journey to Mars symbolizes the enduring human spirit of exploration. It challenges us to innovate, collaborate, and dream beyond our planet, reminding us that the pursuit of knowledge and discovery is at the heart of what it means to be human.`,
    html_content: `<p>The journey to Mars represents one of humanity’s most ambitious and awe-inspiring endeavors, pushing the boundaries of science, technology, and human exploration.</p>

<h2>The Historical Context</h2>
<p>The idea of traveling to Mars has fascinated scientists and visionaries for centuries. From early telescopic observations by Giovanni Schiaparelli in the 19th century to speculative science fiction like Ray Bradbury’s "The Martian Chronicles," Mars has captured humanity’s imagination...</p>

<h2>The Challenges of Martian Exploration</h2>
<p>Reaching Mars is no small feat. The planet lies an average of 225 million kilometers from Earth, with a journey taking roughly 6-9 months one way. Astronauts face immense challenges, including prolonged exposure to radiation, the psychological toll of isolation, and the technical complexity of landing on and surviving in an alien environment...</p>

<h2>The Role of International Collaboration</h2>
<p>The journey to Mars is not just a technological challenge but also a collaborative effort that transcends national boundaries. Space agencies like NASA, ESA, Roscosmos, and private companies such as SpaceX are pooling resources, expertise, and visions to make Mars exploration a reality...</p>

<h2>The Future of Humanity on Mars</h2>
<p>A successful mission to Mars could pave the way for humanity’s expansion into the solar system. Colonizing Mars would not only represent a triumph of human ingenuity but also offer a potential solution to challenges on Earth, such as overpopulation and resource scarcity...</p>

<p>In conclusion, the journey to Mars symbolizes the enduring human spirit of exploration. It challenges us to innovate, collaborate, and dream beyond our planet, reminding us that the pursuit of knowledge and discovery is at the heart of what it means to be human.</p>`,
    image_url: 'https://images.unsplash.com/photo-1573588028698-f4759befb09a?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Space Exploration', 'Mars', 'NASA', 'SpaceX'],
    author: 'Kevin',
    published_at: '2024-02-10',
    created_at: '2024-02-10',
  },
  {
    title: 'The Old Man and the Sea',
    content: `The Old Man and the Sea, written by Ernest Hemingway, is a timeless tale of resilience, struggle, and the indomitable spirit of human beings.

The Historical Context
Published in 1952, The Old Man and the Sea marked a triumphant return for Hemingway, solidifying his place as one of the greatest literary figures of the 20th century. The novella was written during a period when Hemingway’s reputation had begun to wane, but its success earned him both critical acclaim and the Pulitzer Prize for Fiction in 1953.

The story is set in a small Cuban fishing village and follows the journey of Santiago, an aging fisherman who endures a relentless battle with a giant marlin in the Gulf Stream. Through Santiago’s struggle, Hemingway explores universal themes of perseverance, dignity, and man's relationship with nature.

The Struggle Against the Marlin
The central conflict of the story revolves around Santiago’s pursuit of the marlin. For three days and nights, he battles the massive fish, driven by his unwavering determination and deep respect for his adversary. The struggle is not merely physical but also symbolic, representing humanity's eternal fight against the forces of nature and the inevitability of aging.

Despite the eventual loss of the marlin to sharks, Santiago’s battle becomes a testament to his courage and unyielding spirit. Hemingway's vivid descriptions and spare prose capture the raw intensity of the fisherman’s ordeal, immersing readers in the tension and beauty of the open sea.

Themes of Isolation and Resilience
Santiago’s isolation on the sea reflects his internal solitude. Though he is physically alone, his thoughts are filled with memories of his youth, dreams of lions on the African beaches, and his connection to the natural world. His resilience, even in the face of defeat, highlights the human capacity to find meaning and honor in struggle.

Hemingway uses Santiago's plight to depict the essence of the human condition: the pursuit of greatness, the inevitability of loss, and the dignity found in striving against impossible odds.

The Legacy of The Old Man and the Sea
The novella's enduring impact lies in its simplicity and profundity. Hemingway’s use of minimalistic language, combined with rich symbolism, allows the story to resonate across cultures and generations. It is often regarded as a parable of human existence, offering lessons about humility, perseverance, and the beauty of life's struggles.

In conclusion, The Old Man and the Sea remains a masterpiece of modern literature. Through the character of Santiago and his epic struggle, Hemingway reminds us of the resilience of the human spirit and the enduring quest for meaning in a challenging world.`,
    html_content: `<p>The Old Man and the Sea, written by Ernest Hemingway, is a timeless tale of resilience, struggle, and the indomitable spirit of human beings.</p>

<h2>The Historical Context</h2>
<p>Published in 1952, The Old Man and the Sea marked a triumphant return for Hemingway, solidifying his place as one of the greatest literary figures of the 20th century...</p>

<h2>The Struggle Against the Marlin</h2>
<p>The central conflict of the story revolves around Santiago’s pursuit of the marlin. For three days and nights, he battles the massive fish...</p>

<h2>Themes of Isolation and Resilience</h2>
<p>Santiago’s isolation on the sea reflects his internal solitude. Though he is physically alone, his thoughts are filled with memories of his youth...</p>

<h2>The Legacy of The Old Man and the Sea</h2>
<p>The novella's enduring impact lies in its simplicity and profundity. Hemingway’s use of minimalistic language, combined with rich symbolism...</p>

<p>In conclusion, The Old Man and the Sea remains a masterpiece of modern literature. Through the character of Santiago and his epic struggle, Hemingway reminds us of the resilience of the human spirit and the enduring quest for meaning in a challenging world.</p>`,
    image_url: 'https://images.unsplash.com/photo-1545733099-152483684cb5?q=80&w=3088&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Literature', 'Hemingway', 'Classic', 'Resilience'],
    author: 'Vita',
    published_at: '2024-02-10',
    created_at: '2024-02-10',
  },
  {
    title: 'Shaping Dreams with Bricks',
    content: `LEGO, a beloved toy brand, has inspired generations of creators, dreamers, and builders through its iconic bricks that connect creativity and play.

The Historical Context
Founded in 1932 by Ole Kirk Christiansen in Denmark, LEGO started as a small wooden toy company. The name “LEGO” is derived from the Danish words “leg godt,” meaning “play well.” In 1949, the company introduced its first interlocking plastic bricks, which became the foundation of its global success.

Over the decades, LEGO has evolved from a simple toy to a global phenomenon. The introduction of themed sets, such as LEGO Space and LEGO Castle in the 1970s, transformed the brand into a versatile tool for storytelling and imagination. With the launch of LEGO Technic and Mindstorms, the company also bridged the gap between play and engineering education.

The Impact of LEGO on Creativity
LEGO bricks are more than toys—they are tools for creativity and innovation. Children and adults alike use LEGO to bring their ideas to life, whether it’s building a replica of the Eiffel Tower or designing an original spaceship. 

LEGO has also been embraced by educators and institutions worldwide. In classrooms, LEGO is used to teach STEM (Science, Technology, Engineering, and Math) concepts, fostering problem-solving skills and critical thinking.

Beyond education, LEGO is a medium for art and design. Artists have created stunning sculptures and exhibitions using LEGO, proving its versatility and universal appeal.

The Role of Community and Collaboration
A key factor in LEGO’s success is its vibrant global community of fans and builders. The LEGO Ideas platform allows fans to submit their own designs, some of which are turned into official sets. This collaboration between the brand and its community keeps LEGO fresh, innovative, and relevant.

Events like LEGO conventions and exhibitions provide spaces for enthusiasts to share their creations and inspire others. The community-driven nature of LEGO has helped it maintain its popularity and adapt to changing times.

The Future of LEGO
As LEGO continues to grow, it remains committed to sustainability and innovation. The company has pledged to make all its bricks from sustainable materials by 2030, aligning with global efforts to reduce environmental impact.

In addition, LEGO is exploring digital innovation with augmented reality (AR) and virtual reality (VR) experiences. These new frontiers expand the possibilities of play and creativity, ensuring LEGO stays at the forefront of both physical and digital realms.

In conclusion, LEGO has transcended its origins as a simple toy to become a symbol of creativity, learning, and collaboration. With its rich history and forward-looking vision, LEGO continues to shape dreams and inspire generations.`,
    html_content: `<p>LEGO, a beloved toy brand, has inspired generations of creators, dreamers, and builders through its iconic bricks that connect creativity and play.</p>

<h2>The Historical Context</h2>
<p>Founded in 1932 by Ole Kirk Christiansen in Denmark, LEGO started as a small wooden toy company. The name “LEGO” is derived from the Danish words “leg godt,” meaning “play well.”...</p>

<h2>The Impact of LEGO on Creativity</h2>
<p>LEGO bricks are more than toys—they are tools for creativity and innovation. Children and adults alike use LEGO to bring their ideas to life...</p>

<h2>The Role of Community and Collaboration</h2>
<p>A key factor in LEGO’s success is its vibrant global community of fans and builders. The LEGO Ideas platform allows fans to submit their own designs...</p>

<h2>The Future of LEGO</h2>
<p>As LEGO continues to grow, it remains committed to sustainability and innovation. The company has pledged to make all its bricks from sustainable materials by 2030...</p>

<p>In conclusion, LEGO has transcended its origins as a simple toy to become a symbol of creativity, learning, and collaboration. With its rich history and forward-looking vision, LEGO continues to shape dreams and inspire generations.</p>`,
    image_url: 'https://images.unsplash.com/photo-1485550409059-9afb054cada4?q=80&w=2598&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['LEGO', 'Creativity', 'Toys', 'Innovation'],
    author: 'Vita',
    published_at: '2024-03-01',
    created_at: '2024-03-01',
  },
  {
    title: 'Symbols of Grace and Wilderness',
    content: `Deer have long been admired as symbols of grace, beauty, and the untamed wilderness, holding cultural and ecological significance across the world.

The Role of Deer in Nature
Deer play a vital role in maintaining the balance of ecosystems. As herbivores, they help control plant growth, shaping the landscape and fostering biodiversity. Their grazing patterns influence the distribution of seeds, aiding in forest regeneration and the health of natural habitats.

However, the relationship between deer and their environment is a delicate one. Overpopulation in some areas due to the absence of natural predators can lead to overgrazing, negatively impacting plant communities and other wildlife.

Cultural Significance of Deer
Throughout history, deer have held symbolic importance in various cultures. In Native American traditions, deer often represent gentleness, intuition, and spiritual guidance. In Celtic mythology, they are associated with the mystical forest and the connection between the physical and spiritual worlds.

Deer also appear in art and literature as symbols of purity and freedom. Their elegance and swift movements have inspired countless works, from ancient cave paintings to modern poetry.

The Challenges Facing Deer Populations
Despite their resilience, deer face numerous threats in today’s world. Habitat loss due to urbanization and deforestation has fragmented their territories, forcing them into closer proximity to humans. This can result in increased vehicle collisions and conflicts with agriculture.

Climate change poses another significant challenge, altering the availability of food sources and disrupting migration patterns. Conservation efforts are crucial to ensure that deer continue to thrive in their natural environments.

The Connection Between Humans and Deer
The relationship between humans and deer is complex, spanning admiration, coexistence, and conflict. Deer are a source of inspiration for wildlife photographers and nature enthusiasts, but they also pose challenges for farmers and gardeners.

Efforts to manage deer populations through conservation, education, and sustainable practices highlight the need for balance between human activity and wildlife preservation.

In conclusion, deer are not just inhabitants of the wilderness—they are symbols of nature's grace and resilience. Their presence reminds us of the importance of protecting our natural world and living harmoniously with the creatures that share it.`,
    html_content: `<p>Deer have long been admired as symbols of grace, beauty, and the untamed wilderness, holding cultural and ecological significance across the world.</p>

<h2>The Role of Deer in Nature</h2>
<p>Deer play a vital role in maintaining the balance of ecosystems. As herbivores, they help control plant growth, shaping the landscape and fostering biodiversity...</p>

<h2>Cultural Significance of Deer</h2>
<p>Throughout history, deer have held symbolic importance in various cultures. In Native American traditions, deer often represent gentleness, intuition, and spiritual guidance...</p>

<h2>The Challenges Facing Deer Populations</h2>
<p>Despite their resilience, deer face numerous threats in today’s world. Habitat loss due to urbanization and deforestation has fragmented their territories...</p>

<h2>The Connection Between Humans and Deer</h2>
<p>The relationship between humans and deer is complex, spanning admiration, coexistence, and conflict...</p>

<p>In conclusion, deer are not just inhabitants of the wilderness—they are symbols of nature's grace and resilience. Their presence reminds us of the importance of protecting our natural world and living harmoniously with the creatures that share it.</p>`,
    image_url: 'https://images.unsplash.com/photo-1606762803100-5b4833aaccc0?q=80&w=2951&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Wildlife', 'Nature', 'Deer', 'Conservation'],
    author: 'Cameron',
    published_at: '2024-03-15',
    created_at: '2024-03-15',
  },
  {
    title: 'A Dystopian Future',
    content: `Cyberpunk, a genre born from the fusion of advanced technology and societal decay, offers a vivid vision of the future where humanity's relationship with machines is both transformative and perilous.

The Origins of Cyberpunk
Cyberpunk emerged as a distinct literary genre in the 1980s, popularized by works such as William Gibson's *Neuromancer* and Philip K. Dick's *Do Androids Dream of Electric Sheep?*. The term "cyberpunk" encapsulates a world dominated by sprawling megacities, cybernetic enhancements, and a pervasive sense of dystopia.

This genre is characterized by its "high tech, low life" ethos, blending futuristic technology with gritty, noir-like aesthetics. Cyberpunk stories often explore themes of corporate dominance, artificial intelligence, and the blurred boundaries between human and machine.

The Cyberpunk Aesthetic
One of the defining features of cyberpunk is its distinct visual style. Neon-lit streets, towering skyscrapers, and densely packed urban landscapes are hallmarks of the genre. This aesthetic has influenced films like *Blade Runner* and video games like *Cyberpunk 2077*, creating immersive worlds that captivate audiences.

The fashion of cyberpunk reflects its rebellious spirit—think augmented reality goggles, leather jackets, and neon accents. This style underscores the genre's exploration of individuality in a world increasingly controlled by technology.

Themes of Control and Resistance
At its core, cyberpunk delves into themes of power and resistance. It depicts societies where corporations wield more influence than governments, controlling every aspect of life. Amid this control, cyberpunk protagonists often resist the system, embodying the spirit of rebellion and self-determination.

Artificial intelligence and cybernetic augmentation are central to the genre's exploration of identity. What does it mean to be human in a world where consciousness can be uploaded, and bodies can be enhanced or replaced? These questions challenge our understanding of humanity and the ethical implications of technological advancement.

The Influence of Cyberpunk on Culture
Cyberpunk's impact extends far beyond literature and entertainment. It has inspired real-world advancements in technology, from wearable devices to virtual reality. The genre has also influenced music, particularly in the synthwave and electronic genres, capturing the mood of a neon-drenched future.

In gaming, titles like *Deus Ex* and *Cyberpunk 2077* have brought the genre to life, allowing players to immerse themselves in richly detailed cyberpunk worlds. These experiences highlight the enduring appeal of the genre's themes and aesthetics.

The Future of Cyberpunk
As technology continues to evolve, the relevance of cyberpunk grows. The genre's cautionary tales about unchecked corporate power, invasive surveillance, and the erosion of privacy resonate strongly in today's world. Cyberpunk challenges us to consider how we shape the future of technology and society.

In conclusion, cyberpunk is more than a genre—it is a lens through which we explore the possibilities and perils of a technology-driven world. Its vivid imagery and profound themes remind us of the need to balance progress with humanity, ensuring that the future remains a place where individuality and creativity thrive.`,
    html_content: `<p>Cyberpunk, a genre born from the fusion of advanced technology and societal decay, offers a vivid vision of the future where humanity's relationship with machines is both transformative and perilous.</p>

<h2>The Origins of Cyberpunk</h2>
<p>Cyberpunk emerged as a distinct literary genre in the 1980s, popularized by works such as William Gibson's *Neuromancer* and Philip K. Dick's *Do Androids Dream of Electric Sheep?*. The term "cyberpunk" encapsulates a world dominated by sprawling megacities...</p>

<h2>The Cyberpunk Aesthetic</h2>
<p>One of the defining features of cyberpunk is its distinct visual style. Neon-lit streets, towering skyscrapers, and densely packed urban landscapes are hallmarks of the genre...</p>

<h2>Themes of Control and Resistance</h2>
<p>At its core, cyberpunk delves into themes of power and resistance. It depicts societies where corporations wield more influence than governments...</p>

<h2>The Influence of Cyberpunk on Culture</h2>
<p>Cyberpunk's impact extends far beyond literature and entertainment. It has inspired real-world advancements in technology, from wearable devices to virtual reality...</p>

<h2>The Future of Cyberpunk</h2>
<p>As technology continues to evolve, the relevance of cyberpunk grows. The genre's cautionary tales about unchecked corporate power, invasive surveillance, and the erosion of privacy resonate strongly in today's world...</p>

<p>In conclusion, cyberpunk is more than a genre—it is a lens through which we explore the possibilities and perils of a technology-driven world...</p>`,
    image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=2970&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Cyberpunk', 'Sci-Fi', 'Technology', 'Dystopia'],
    author: 'Karson',
    published_at: '2024-04-01',
    created_at: '2024-04-01',
  },
  {
    title: 'Diver Dave',
    content: `Diver Dave, an adventurer of the underwater world, inspires awe and curiosity as he explores the hidden realms beneath the ocean's surface.

The Wonders of the Ocean
The ocean, covering over 70% of Earth's surface, remains one of the least explored frontiers. Its depths hold countless mysteries, from vibrant coral reefs teeming with life to eerie shipwrecks that whisper tales of the past. For Diver Dave, the allure of the ocean lies in its endless potential for discovery.

As a professional diver, Dave has ventured into underwater caves, explored kelp forests, and encountered marine creatures ranging from gentle sea turtles to majestic manta rays. Each dive offers a new perspective on the intricate ecosystems that thrive beneath the waves.

The Challenges of Diving
Diving into the depths of the ocean is not without its challenges. The underwater world is both beautiful and unforgiving, requiring divers like Dave to possess extensive training, physical endurance, and mental resilience.

From navigating strong currents to managing limited oxygen supplies, divers face constant risks. Yet, these challenges are outweighed by the rewards of witnessing the ocean's breathtaking beauty and unraveling its secrets.

The Importance of Marine Conservation
Through his adventures, Diver Dave has become a passionate advocate for marine conservation. He has witnessed firsthand the devastating effects of pollution, overfishing, and climate change on underwater ecosystems.

Coral bleaching, plastic waste, and dwindling fish populations serve as stark reminders of humanity's impact on the ocean. Dave uses his platform to raise awareness about the importance of protecting marine environments and promoting sustainable practices.

The Connection Between Humans and the Ocean
For Diver Dave, the ocean is not just a place to explore but a source of inspiration and connection. The weightless sensation of being underwater, surrounded by the vibrant hues of coral and the rhythmic dance of fish, offers a sense of serenity and wonder.

Diving also fosters a deep respect for nature. It reminds us of the delicate balance that sustains life on Earth and the responsibility we bear to preserve it for future generations.

In conclusion, Diver Dave's journey into the underwater world is a testament to the spirit of exploration and the importance of protecting our planet's most vital resource. Through his dives, he not only uncovers the mysteries of the deep but also inspires others to appreciate and safeguard the ocean's beauty.`,
    html_content: `<p>Diver Dave, an adventurer of the underwater world, inspires awe and curiosity as he explores the hidden realms beneath the ocean's surface.</p>

<h2>The Wonders of the Ocean</h2>
<p>The ocean, covering over 70% of Earth's surface, remains one of the least explored frontiers. Its depths hold countless mysteries...</p>

<h2>The Challenges of Diving</h2>
<p>Diving into the depths of the ocean is not without its challenges. The underwater world is both beautiful and unforgiving...</p>

<h2>The Importance of Marine Conservation</h2>
<p>Through his adventures, Diver Dave has become a passionate advocate for marine conservation...</p>

<h2>The Connection Between Humans and the Ocean</h2>
<p>For Diver Dave, the ocean is not just a place to explore but a source of inspiration and connection...</p>

<p>In conclusion, Diver Dave's journey into the underwater world is a testament to the spirit of exploration and the importance of protecting our planet's most vital resource...</p>`,
    image_url: 'https://images.unsplash.com/photo-1736943993999-3889ed6a8b18?q=80&w=1848&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Diving', 'Ocean', 'Adventure', 'Conservation'],
    author: 'Dewey',
    published_at: '2024-04-15',
    created_at: '2024-04-15',
  },
  {
    title: 'Nature\'s Marvel',
    content: `The leaf, often overlooked in its simplicity, is one of nature’s most remarkable creations, serving as the foundation of life on Earth.

The Anatomy of a Leaf
A leaf is much more than just a green appendage on a tree or plant. Its structure is a masterpiece of biological engineering. The surface of a leaf is coated with a waxy cuticle to prevent water loss, while its inner layers house chloroplasts—the site of photosynthesis. Through this process, leaves convert sunlight into energy, producing the oxygen we breathe and sustaining the planet's ecosystems.

Each leaf tells a story of adaptation. From the broad, flat leaves of tropical plants designed to capture sunlight in dense forests, to the needle-like leaves of conifers that withstand harsh winters, the diversity of leaf structures is a testament to nature’s ingenuity.

The Role of Leaves in the Ecosystem
Leaves are essential to the survival of nearly all life forms. They not only generate oxygen but also provide food and habitat for countless organisms. Herbivores rely on leaves as a primary food source, while insects and small animals often find shelter in their foliage.

When leaves fall, their journey doesn’t end. Decomposing leaves enrich the soil with nutrients, fueling the growth of future plant life. This cycle underscores the interconnectedness of all living things in an ecosystem.

Cultural and Symbolic Significance
Throughout history, leaves have held profound cultural and symbolic meanings. In ancient Greek and Roman societies, laurel leaves were used to crown victors, symbolizing honor and achievement. In Eastern philosophies, the leaf often represents growth, renewal, and the transient nature of life.

Art and literature frequently draw inspiration from leaves. Their changing colors in autumn evoke themes of transformation and the passage of time, while the vibrant greens of spring symbolize renewal and hope.

The Challenges Facing Leaves Today
Modern environmental challenges pose significant threats to the world’s leaves. Deforestation, climate change, and air pollution disrupt the delicate balance of ecosystems, reducing the ability of leaves to perform their critical functions.

Urbanization further isolates trees and plants, limiting the greenery that is crucial for filtering air, regulating temperatures, and supporting biodiversity. Conservation efforts are essential to ensure that leaves, and the ecosystems they sustain, continue to thrive.

The Beauty of a Leaf
Beyond their ecological and cultural significance, leaves are symbols of beauty and tranquility. The intricate veins, varied shapes, and seasonal colors of leaves remind us of the artistry present in nature.

In conclusion, the humble leaf is a cornerstone of life on Earth. It connects us to the natural world, providing sustenance, inspiration, and a reminder of the delicate balance that sustains life. Protecting leaves means protecting the future of our planet.`,
    html_content: `<p>The leaf, often overlooked in its simplicity, is one of nature’s most remarkable creations, serving as the foundation of life on Earth.</p>

<h2>The Anatomy of a Leaf</h2>
<p>A leaf is much more than just a green appendage on a tree or plant. Its structure is a masterpiece of biological engineering...</p>

<h2>The Role of Leaves in the Ecosystem</h2>
<p>Leaves are essential to the survival of nearly all life forms. They not only generate oxygen but also provide food and habitat for countless organisms...</p>

<h2>Cultural and Symbolic Significance</h2>
<p>Throughout history, leaves have held profound cultural and symbolic meanings. In ancient Greek and Roman societies, laurel leaves were used to crown victors...</p>

<h2>The Challenges Facing Leaves Today</h2>
<p>Modern environmental challenges pose significant threats to the world’s leaves. Deforestation, climate change, and air pollution disrupt the delicate balance of ecosystems...</p>

<h2>The Beauty of a Leaf</h2>
<p>Beyond their ecological and cultural significance, leaves are symbols of beauty and tranquility...</p>

<p>In conclusion, the humble leaf is a cornerstone of life on Earth. It connects us to the natural world, providing sustenance, inspiration, and a reminder of the delicate balance that sustains life...</p>`,
    image_url: 'https://images.unsplash.com/photo-1563364664-399838d1394c?q=80&w=2973&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Nature', 'Environment', 'Leaves', 'Conservation'],
    author: 'Mia',
    published_at: '2024-04-25',
    created_at: '2024-04-25',
  },
  {
    title: 'A Vast and Mysterious Cosmos',
    content: `The universe, an expansive realm of stars, galaxies, and cosmic wonders, holds infinite mysteries that continue to captivate humanity.

The Origins of the Universe
The story of the universe begins with the Big Bang, an event that occurred approximately 13.8 billion years ago. This singular explosion set the cosmos into motion, creating time, space, and the building blocks of matter. Over billions of years, gravity pulled gas and dust together to form stars, planets, and galaxies.

The Big Bang theory, supported by evidence such as cosmic microwave background radiation and the observed expansion of the universe, serves as the cornerstone of modern cosmology. Yet, questions remain about what existed before the Big Bang and the forces that sparked its occurrence.

The Structure of the Universe
The universe is a tapestry of immense complexity. Galaxies, the universe's building blocks, contain billions of stars, planets, and nebulae. Our own Milky Way is one of over two trillion galaxies estimated to exist in the observable universe.

At a smaller scale, the universe is governed by fundamental particles and forces. Quantum mechanics explains the behavior of particles like quarks and electrons, while general relativity describes the gravitational interplay between massive objects. The interplay between these two realms is an ongoing area of scientific exploration.

The Search for Extraterrestrial Life
The universe’s vastness raises an age-old question: Are we alone? Scientists have identified exoplanets in habitable zones—regions around stars where conditions might support liquid water and, potentially, life. Missions like the James Webb Space Telescope aim to uncover the atmospheres and compositions of these distant worlds.

The search for extraterrestrial life also includes listening for signals from intelligent civilizations. The SETI (Search for Extraterrestrial Intelligence) initiative has scanned the skies for decades, hoping to detect signs of communication from beyond Earth.

The Universe and Humanity
The universe is not just a scientific frontier—it is a source of philosophical reflection and wonder. For millennia, humans have gazed at the stars, seeking answers to profound questions about existence, purpose, and our place in the cosmos.

Through exploration, humanity has gained a deeper connection to the universe. Space missions, such as the Apollo moon landings and robotic explorers like Voyager, have expanded our horizons, inspiring generations to dream of reaching the stars.

The Future of Cosmic Exploration
As technology advances, humanity’s reach into the universe grows. Plans for missions to Mars, the establishment of lunar bases, and the exploration of Europa and Titan promise to reveal more about our cosmic neighborhood.

The long-term vision includes interstellar travel—sending probes to other star systems and, perhaps one day, humans to other planets. Such endeavors will require breakthroughs in propulsion, life support, and energy generation.

In conclusion, the universe is both a frontier of discovery and a source of inspiration. Its immense scale and countless mysteries remind us of the limitless potential of exploration and the enduring human desire to understand the cosmos.`,
    html_content: `<p>The universe, an expansive realm of stars, galaxies, and cosmic wonders, holds infinite mysteries that continue to captivate humanity.</p>

<h2>The Origins of the Universe</h2>
<p>The story of the universe begins with the Big Bang, an event that occurred approximately 13.8 billion years ago...</p>

<h2>The Structure of the Universe</h2>
<p>The universe is a tapestry of immense complexity. Galaxies, the universe's building blocks, contain billions of stars, planets, and nebulae...</p>

<h2>The Search for Extraterrestrial Life</h2>
<p>The universe’s vastness raises an age-old question: Are we alone? Scientists have identified exoplanets in habitable zones...</p>

<h2>The Universe and Humanity</h2>
<p>The universe is not just a scientific frontier—it is a source of philosophical reflection and wonder...</p>

<h2>The Future of Cosmic Exploration</h2>
<p>As technology advances, humanity’s reach into the universe grows. Plans for missions to Mars, the establishment of lunar bases...</p>

<p>In conclusion, the universe is both a frontier of discovery and a source of inspiration. Its immense scale and countless mysteries remind us of the limitless potential of exploration and the enduring human desire to understand the cosmos.</p>`,
    image_url: 'https://images.unsplash.com/photo-1610296669228-602fa827fc1f?q=80&w=2875&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Universe', 'Cosmos', 'Space Exploration', 'Science'],
    author: 'Kevin',
    published_at: '2024-05-01',
    created_at: '2024-05-01',
  },
  {
    title: 'The Beauty of Flowers',
    content: `Flowers, with their vibrant colors, intricate patterns, and enchanting fragrances, are among nature’s most captivating creations.

The Role of Flowers in Nature
Flowers are essential components of the ecosystem, serving as reproductive structures for plants. Through pollination, they enable the production of seeds, ensuring the continuation of plant species. This process is facilitated by pollinators like bees, butterflies, and birds, which are drawn to the nectar and bright colors of flowers.

Beyond reproduction, flowers play a critical role in supporting biodiversity. They provide food and habitat for numerous insects and animals, contributing to the intricate web of life on Earth.

The Cultural Significance of Flowers
Throughout history, flowers have held deep symbolic meanings in cultures worldwide. In ancient Greece, flowers were associated with gods and myths. For instance, the rose was linked to Aphrodite, the goddess of love. In Japan, cherry blossoms symbolize the fleeting nature of life, while in India, the lotus is a sacred emblem of purity and spiritual enlightenment.

Flowers also hold a special place in human traditions. They are given as gifts to express emotions, from love and gratitude to sympathy and remembrance. Festivals like the Dutch Tulip Festival and Japan’s Hanami celebrate the beauty and significance of flowers.

The Healing Power of Flowers
Flowers are not only beautiful but also have therapeutic benefits. Practices like aromatherapy harness the scents of flowers, such as lavender and jasmine, to promote relaxation and well-being. Studies have shown that being around flowers can reduce stress, boost mood, and enhance creativity.

In medicine, certain flowers like chamomile and calendula are used for their healing properties. These natural remedies have been part of traditional medicine for centuries.

The Challenges Facing Flowers
Despite their resilience, flowers face challenges from environmental threats like habitat destruction, pollution, and climate change. Wildflower populations are particularly vulnerable, as urbanization encroaches on natural landscapes.

Conservation efforts, including planting native flowers and creating pollinator-friendly gardens, are essential to protect these delicate yet vital components of the ecosystem.

The Universal Appeal of Flowers
The beauty of flowers transcends cultures and borders. From the towering sunflower fields to the delicate orchids of the rainforest, flowers remind us of nature’s infinite creativity and the importance of preserving it.

In conclusion, flowers are much more than decorative elements. They are symbols of life, resilience, and connection to the natural world. Protecting and cherishing flowers ensures that their beauty and significance endure for generations to come.`,
    html_content: `<p>Flowers, with their vibrant colors, intricate patterns, and enchanting fragrances, are among nature’s most captivating creations.</p>

<h2>The Role of Flowers in Nature</h2>
<p>Flowers are essential components of the ecosystem, serving as reproductive structures for plants...</p>

<h2>The Cultural Significance of Flowers</h2>
<p>Throughout history, flowers have held deep symbolic meanings in cultures worldwide...</p>

<h2>The Healing Power of Flowers</h2>
<p>Flowers are not only beautiful but also have therapeutic benefits...</p>

<h2>The Challenges Facing Flowers</h2>
<p>Despite their resilience, flowers face challenges from environmental threats like habitat destruction...</p>

<h2>The Universal Appeal of Flowers</h2>
<p>The beauty of flowers transcends cultures and borders...</p>

<p>In conclusion, flowers are much more than decorative elements. They are symbols of life, resilience, and connection to the natural world...</p>`,
    image_url: 'https://images.unsplash.com/photo-1442458017215-285b83f65851?q=80&w=2448&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tags: ['Flowers', 'Nature', 'Pollination', 'Beauty'],
    author: 'Joy',
    published_at: '2024-05-15',
    created_at: '2024-05-15',
  },
];

// 根据环境使用不同的数据库路径
const dbPath = process.env.NODE_ENV === 'production'
  ? path.join('/data', 'blog.db')
  : path.join(process.cwd(), 'blog.db');

let db;

async function initializeDatabase() {
  try {
    // 确保数据库目录存在
    await fsPromises.mkdir(path.dirname(dbPath), { recursive: true });
    
    // 打开数据库连接
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // 启用外键约束
    await db.run('PRAGMA foreign_keys = ON');
    
    // 读取并执行 schema.sql
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    const schema = await fsPromises.readFile(schemaPath, 'utf-8');
    
    // 执行建表语句
    await db.exec(schema);

    // 初始化默认用户
    for (const user of defaultUsers) {
      const existingUser = await db.get(
        'SELECT * FROM users WHERE username = ?',
        [user.username]
      );
      
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const avatarUrl = await downloadAndSaveAvatar(user.username);
        const createdAt = getRandomCreatedAt();
        
        await db.run(
          `INSERT INTO users (
            username, password, role, status, real_name, 
            date_of_birth, bio, avatar_url, created_at
          ) VALUES (?, ?, 'admin', 'active', ?, ?, ?, ?, ?)`,
          [
            user.username,
            hashedPassword,
            user.realName,
            user.dateOfBirth,
            user.bio,
            avatarUrl,
            createdAt
          ]
        );
        console.log(`默认用户 ${user.username} 创建成功`);
      }
    }
    
    // 初始化默认用户后，创建默认文章
    for (const article of defaultArticles) {
      const existingArticle = await db.get(
        'SELECT * FROM articles WHERE title = ?',
        [article.title]
      );

      if (!existingArticle) {
        await transaction(async ({ run, get }) => {
          // 获取作者ID
          const author = await get('SELECT id FROM users WHERE username = ?', [article.author]);
          
          // 插入文章
          const result = await run(
            `INSERT INTO articles (
              title, content, html_content, image_url, status, 
              view_count, author_id, published_at, created_at
            ) VALUES (?, ?, ?, ?, 'published', ?, ?, ?, ?)`,
            [
              article.title,
              article.content,
              article.html_content,
              article.image_url,
              Math.floor(Math.random() * 1000) + 500, // 随机浏览量
              author.id,
              new Date(article.published_at).toISOString(),
              new Date(article.created_at).toISOString()
            ]
          );

          const articleId = result.lastID;

          // 创建标签
          for (const tagName of article.tags) {
            // 检查标签是否存在，不存在则创建
            let tag = await get('SELECT id FROM tags WHERE name = ?', [tagName]);
            if (!tag) {
              const tagResult = await run('INSERT INTO tags (name) VALUES (?)', [tagName]);
              tag = { id: tagResult.lastID };
            }

            // 关联文章和标签
            await run(
              'INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)',
              [articleId, tag.id]
            );
          }

          // 添加更多反应
          const reactions = ['like', 'love', 'celebrate', 'insightful', 'support'];
          const users = await db.all('SELECT id FROM users');
          for (const user of users) {
            // 每个用户有70%的概率添加反应
            if (Math.random() < 0.7) {
              const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
              await run(
                'INSERT INTO article_reactions (article_id, user_id, type) VALUES (?, ?, ?)',
                [articleId, user.id, randomReaction]
              );
            }
          }

          // 添加评论模板池
          const commentTemplates = {
            tech: [
              {
                main: [
                  "Excellent analysis! The technical depth really shows your expertise in this area.",
                  "This is a fascinating perspective on the evolution of technology. Really enjoyed reading it.",
                  "Great article! The historical context you've provided really helps understand the current state.",
                  "Very comprehensive overview. I particularly appreciate the technical details you've included.",
                  "This is exactly the kind of in-depth analysis I've been looking for on this topic.",
                  "Brilliant piece! The way you've connected different aspects of tech evolution is enlightening.",
                  "Your insights on this topic are spot-on. Really helped clarify some concepts for me."
                ],
                replies: [
                  "Completely agree with your points. Would love to see more articles like this.",
                  "You've raised some interesting points. I think this deserves more discussion.",
                  "This perspective adds a lot to the conversation. Thanks for sharing!",
                  "Your analysis is quite thorough. I've learned something new today.",
                  "Really insightful comment. It's great to see such informed discussion.",
                  "This is a great addition to the main article. Thanks for the detailed explanation."
                ],
                deepReplies: [
                  "That's an excellent point! Hadn't considered that aspect before.",
                  "Thanks for the additional context. Really helps complete the picture.",
                  "Your technical knowledge really shines through in this explanation.",
                  "This kind of detailed discussion is what makes these comments valuable.",
                  "Appreciate you sharing your expertise on this matter.",
                  "Very well explained. This adds another layer to the discussion."
                ]
              }
            ],
            privacy: [
              {
                main: [
                  "Important discussion on privacy concerns in the digital age.",
                  "The balance between security and privacy is crucial - great analysis.",
                  "This raises some critical points about data protection.",
                  "Thoughtful examination of modern surveillance challenges.",
                  "Really appreciate the balanced perspective on this sensitive topic.",
                  "The ethical implications discussed here are particularly relevant today."
                ],
                replies: [
                  "Privacy is indeed becoming increasingly important in our connected world.",
                  "These concerns need more attention in public discourse.",
                  "The technical safeguards mentioned are crucial for future developments.",
                  "This kind of awareness is essential for informed decision-making.",
                  "The regulatory aspects discussed here are particularly interesting."
                ],
                deepReplies: [
                  "Regulation definitely needs to keep pace with technology.",
                  "User awareness is key to maintaining digital privacy.",
                  "The technical solutions proposed here are promising.",
                  "This kind of detailed analysis helps inform better policy.",
                  "Security and privacy don't have to be mutually exclusive."
                ]
              }
            ]
          };

          // 随机选择评论函数
          function getRandomComment(type = 'tech') {
            const templates = commentTemplates[type];
            const template = templates[Math.floor(Math.random() * templates.length)];
            const mainComments = template.main;
            const replies = template.replies;
            const deepReplies = template.deepReplies;

            return {
              content: mainComments[Math.floor(Math.random() * mainComments.length)],
              replies: Array(Math.floor(Math.random() * 3) + 1).fill(null).map(() => ({
                content: replies[Math.floor(Math.random() * replies.length)],
                replies: Array(Math.floor(Math.random() * 2)).fill(null).map(() => ({
                  content: deepReplies[Math.floor(Math.random() * deepReplies.length)]
                }))
              }))
            };
          }

          // 在文章创建部分，替换原有的静态评论数组
          const comments = Array(Math.floor(Math.random() * 3) + 2).fill(null).map(() => 
            getRandomComment(article.title.toLowerCase().includes('monitoring') ? 'privacy' : 'tech')
          );

          // 递归函数来插入评论
          async function insertComment(comment, parentId = null) {
            // 随机选择一个用户作为评论作者
            const randomUser = users[Math.floor(Math.random() * users.length)];
            
            const commentResult = await run(
              'INSERT INTO comments (content, user_id, article_id, parent_id) VALUES (?, ?, ?, ?)',
              [comment.content, randomUser.id, articleId, parentId]
            );

            if (comment.replies) {
              for (const reply of comment.replies) {
                await insertComment(reply, commentResult.lastID);
              }
            }
          }

          // 插入所有评论
          for (const comment of comments) {
            await insertComment(comment);
          }
        });
        
        console.log(`默认文章 "${article.title}" 创建成功`);
      }
    }
    
    console.log('数据库初始化完成');
    return db;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

export function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initializeDatabase()');
  }
  return db;
}

// 导出一些通用的数据库操作辅助函数
export async function query(sql, params = []) {
  return await getDb().all(sql, params);
}

export async function get(sql, params = []) {
  return await getDb().get(sql, params);
}

export async function run(sql, params = []) {
  return await getDb().run(sql, params);
}

// 事务辅助函数
export async function transaction(callback, maxRetries = 3) {
  const db = getDb();
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      await db.run('BEGIN');
      console.log('事务开始');

      const result = await callback({
        run: async (sql, params = []) => {
          console.log('执行 SQL:', sql, '参数:', params);
          return await db.run(sql, params);
        },
        get: async (sql, params = []) => {
          console.log('执行 SQL:', sql, '参数:', params);
          return await db.get(sql, params);
        },
        query: async (sql, params = []) => {
          console.log('执行 SQL:', sql, '参数:', params);
          return await db.all(sql, params);
        }
      });

      await db.run('COMMIT');
      console.log('事务提交成功');
      return result;
    } catch (error) {
      console.error(`事务执行失败 (尝试 ${retryCount + 1}/${maxRetries}):`, error);
      
      try {
        await db.run('ROLLBACK');
        console.log('事务回滚成功');
      } catch (rollbackError) {
        console.error('事务回滚失败:', rollbackError);
      }

      if (error.code === 'SQLITE_BUSY' && retryCount < maxRetries - 1) {
        retryCount++;
        console.log(`等待后重试 (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }

      throw error;
    }
  }
}

// 初始化数据库
initializeDatabase().catch(console.error); 