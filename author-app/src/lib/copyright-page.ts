export function generateCopyrightPageText(opts: {
  title: string;
  author: string;
  copyrightHolder?: string;
  pubYear?: number;
  isbn?: string;
  edition?: string;
}): string {
  const year = opts.pubYear || new Date().getFullYear();
  const holder = opts.copyrightHolder || opts.author || "the author";

  const lines = [
    opts.title,
    "",
    `Copyright © ${year} by ${holder}.`,
    "",
    "All rights reserved. No part of this publication may be reproduced, distributed, or " +
      "transmitted in any form or by any means, including photocopying, recording, or other " +
      "electronic or mechanical methods, without the prior written permission of the publisher, " +
      "except in the case of brief quotations embodied in critical reviews and certain other " +
      "noncommercial uses permitted by copyright law.",
    "",
    "This is a work of fiction. Names, characters, businesses, places, events, and incidents " +
      "are either the products of the author's imagination or used in a fictitious manner. Any " +
      "resemblance to actual persons, living or dead, or actual events is purely coincidental.",
    "",
    "Published by 36Seas Publishing.",
    "",
    opts.isbn ? `ISBN: ${opts.isbn}` : undefined,
    opts.edition ? `${opts.edition}` : undefined,
    "",
    "First edition.",
  ].filter((l): l is string => l !== undefined);

  return lines.join("\n");
}
