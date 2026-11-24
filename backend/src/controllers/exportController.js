const MarkdownIt = require("markdown-it");
const bookModel = require("../models/Book");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    ImageRun,
} = require("docx");

const md = new MarkdownIt();

// ==========================================
// DOCX CONFIGURATION & HELPERS
// ==========================================

const DOCX_STYLES = {
    fonts: {
        body: "Charter",
        headings: "Inter",
        code: "Courier New",
    },
    sizes: {
        title: 32,
        subtitle: 20,
        author: 18,
        chapterTitle: 24,
        h1: 20,
        h2: 18,
        h3: 16,
        h4: 14,
        h5: 13,
        h6: 12,
        body: 12,
        code: 10,
    },
    spacing: {
        paragraphBefore: 200,
        paragraphAfter: 200,
        chapterBefore: 400,
        chapterAfter: 300,
        headingBefore: 300,
        headingAfter: 150,
    },
};

// Process inline content (bold, italic, inline code, text) for DOCX
const processInlineContent = (children = [], baseOptions = {}) => {
    const runs = [];
    let bold = baseOptions.bold || false;
    let italics = baseOptions.italics || false;
    let code = baseOptions.code || false;

    for (const child of children) {
        if (child.type === "strong_open") {
            bold = true;
        } else if (child.type === "strong_close") {
            bold = baseOptions.bold || false;
        } else if (child.type === "em_open") {
            italics = true;
        } else if (child.type === "em_close") {
            italics = baseOptions.italics || false;
        } else if (child.type === "code_inline") {
            runs.push(
                new TextRun({
                    text: child.content,
                    font: DOCX_STYLES.fonts.code,
                    size: DOCX_STYLES.sizes.code * 2,
                    bold,
                    italics,
                    color: baseOptions.color,
                })
            );
        } else if (child.type === "text") {
            runs.push(
                new TextRun({
                    text: child.content,
                    font: code
                        ? DOCX_STYLES.fonts.code
                        : baseOptions.font || DOCX_STYLES.fonts.body,
                    size:
                        ((code ? DOCX_STYLES.sizes.code : baseOptions.size) ||
                            DOCX_STYLES.sizes.body) * 2,
                    bold,
                    italics,
                    color: baseOptions.color,
                })
            );
        } else if (child.type === "softbreak") {
            runs.push(
                new TextRun({
                    text: " ",
                    font: baseOptions.font || DOCX_STYLES.fonts.body,
                })
            );
        } else if (child.type === "hardbreak") {
            runs.push(new TextRun({ text: "", break: 1 }));
        }
    }

    return runs;
};

const processMarkdownToDocx = (markdown) => {
    const paragraphs = [];
    const tokens = md.parse(markdown, {});
    let listType = null;
    let orderedCounter = 1;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        try {
            if (token.type === "heading_open") {
                const level = parseInt(token.tag.substring(1), 10);
                const nextToken = tokens[i + 1];

                if (nextToken && nextToken.type === "inline") {
                    const headingMap = {
                        1: { heading: HeadingLevel.HEADING_1, size: DOCX_STYLES.sizes.h1 },
                        2: { heading: HeadingLevel.HEADING_2, size: DOCX_STYLES.sizes.h2 },
                        3: { heading: HeadingLevel.HEADING_3, size: DOCX_STYLES.sizes.h3 },
                        4: { heading: HeadingLevel.HEADING_4, size: DOCX_STYLES.sizes.h4 },
                        5: { heading: HeadingLevel.HEADING_5, size: DOCX_STYLES.sizes.h5 },
                        6: { heading: HeadingLevel.HEADING_6, size: DOCX_STYLES.sizes.h6 },
                    };
                    const cfg = headingMap[level] || headingMap[6];

                    paragraphs.push(
                        new Paragraph({
                            heading: cfg.heading,
                            spacing: {
                                before: DOCX_STYLES.spacing.headingBefore,
                                after: DOCX_STYLES.spacing.headingAfter,
                            },
                            children: [
                                new TextRun({
                                    text: nextToken.content,
                                    bold: true,
                                    font: DOCX_STYLES.fonts.headings,
                                    size: cfg.size * 2,
                                }),
                            ],
                        })
                    );

                    i += 2;
                }
            } else if (token.type === "paragraph_open") {
                const nextToken = tokens[i + 1];

                if (nextToken && nextToken.type === "inline" && nextToken.children) {
                    const textRuns = processInlineContent(nextToken.children, {
                        font: DOCX_STYLES.fonts.body,
                        size: DOCX_STYLES.sizes.body,
                    });

                    if (textRuns.length > 0) {
                        paragraphs.push(
                            new Paragraph({
                                children: textRuns,
                                spacing: {
                                    before: DOCX_STYLES.spacing.paragraphBefore,
                                    after: DOCX_STYLES.spacing.paragraphAfter,
                                },
                            })
                        );
                    }

                    i += 2;
                }
            } else if (token.type === "bullet_list_open") {
                listType = "bullet";
            } else if (token.type === "bullet_list_close") {
                listType = null;
                paragraphs.push(new Paragraph({ text: "", spacing: { after: 100 } }));
            } else if (token.type === "ordered_list_open") {
                listType = "ordered";
                orderedCounter = 1;
            } else if (token.type === "ordered_list_close") {
                listType = null;
                orderedCounter = 1;
                paragraphs.push(new Paragraph({ text: "", spacing: { after: 100 } }));
            } else if (token.type === "list_item_open") {
                const nextToken = tokens[i + 1];

                if (nextToken && nextToken.type === "paragraph_open") {
                    const inlineToken = tokens[i + 2];

                    if (
                        inlineToken &&
                        inlineToken.type === "inline" &&
                        inlineToken.children
                    ) {
                        const textRuns = processInlineContent(inlineToken.children, {
                            font: DOCX_STYLES.fonts.body,
                            size: DOCX_STYLES.sizes.body,
                        });

                        const prefix =
                            listType === "ordered" ? `${orderedCounter++}. ` : "• ";

                        paragraphs.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: prefix,
                                        font: DOCX_STYLES.fonts.body,
                                        size: DOCX_STYLES.sizes.body * 2,
                                    }),
                                    ...textRuns,
                                ],
                                spacing: { before: 50, after: 50 },
                                indent: { left: 720 },
                            })
                        );

                        i += 4;
                    }
                }
            } else if (token.type === "blockquote_open") {
                const nextToken = tokens[i + 1];
                if (nextToken && nextToken.type === "paragraph_open") {
                    const inlineToken = tokens[i + 2];
                    if (inlineToken && inlineToken.type === "inline") {
                        paragraphs.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: inlineToken.content,
                                        italics: true,
                                        color: "666666",
                                        font: DOCX_STYLES.fonts.body,
                                        size: DOCX_STYLES.sizes.body * 2,
                                    }),
                                ],
                                spacing: { before: 200, after: 200 },
                                indent: { left: 720 },
                                alignment: AlignmentType.JUSTIFIED,
                                border: {
                                    left: {
                                        color: "4F46E5",
                                        space: 1,
                                        style: "single",
                                        size: 24,
                                    },
                                },
                            })
                        );

                        i += 4;
                    }
                }
            } else if (token.type === "code_block" || token.type === "fence") {
                paragraphs.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: token.content,
                                font: DOCX_STYLES.fonts.code,
                                size: DOCX_STYLES.sizes.code * 2,
                                color: "333333",
                            }),
                        ],
                        spacing: { before: 200, after: 200 },
                        shading: {
                            fill: "F5F5F5",
                        },
                    })
                );
            } else if (token.type === "hr") {
                paragraphs.push(
                    new Paragraph({
                        text: "",
                        border: {
                            bottom: {
                                color: "CCCCCC",
                                space: 1,
                                style: "single",
                                size: 6,
                            },
                        },
                        spacing: { before: 200, after: 200 },
                    })
                );
            }
        } catch (tokenError) {
            console.error("Error processing token:", token.type, tokenError);
        }
    }

    return paragraphs;
};

const exportAsDocument = async (req, res) => {
    try {
        const book = await bookModel.findById(req.params.id);

        if (!book) {
            return res.status(404).json({ message: "book not found" });
        }

        if (book.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }

        const sections = [];

        if (book.coverImage && !book.coverImage.includes("pravatar")) {
            const imagePath = book.coverImage.replace(/^\/+/, "");
            const ext = path.extname(imagePath).toLowerCase().replace(".", "");
            const imageType = ["png", "jpg", "jpeg", "gif", "bmp"].includes(ext)
                ? ext === "jpg"
                    ? "jpeg"
                    : ext
                : "png";

            try {
                if (fs.existsSync(imagePath)) {
                    const imageBuffer = fs.readFileSync(imagePath);

                    sections.push(
                        new Paragraph({ text: "", spacing: { before: 1000 } }),
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    type: imageType,
                                    data: imageBuffer,
                                    transformation: {
                                        width: 400,
                                        height: 550,
                                    },
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 200, after: 400 },
                        }),
                        new Paragraph({ text: "", pageBreakBefore: true })
                    );
                }
            } catch (imgError) {
                console.log("error embedding image", imagePath, imgError);
            }
        }

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: book.title,
                        bold: true,
                        font: DOCX_STYLES.fonts.headings,
                        size: DOCX_STYLES.sizes.title * 2,
                        color: "1A202C",
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 2000, after: 400 },
            })
        );

        if (book.subtitle && book.subtitle.trim()) {
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: book.subtitle,
                            font: DOCX_STYLES.fonts.body,
                            size: DOCX_STYLES.sizes.subtitle * 2,
                            color: "4A5568",
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                })
            );
        }

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `by ${book.author}`,
                        font: DOCX_STYLES.fonts.headings,
                        size: DOCX_STYLES.sizes.author * 2,
                        color: "2D3748",
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
            })
        );

        (book.chapters || []).forEach((chapter) => {
            try {
                sections.push(
                    new Paragraph({
                        text: "",
                        pageBreakBefore: true,
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: chapter.title,
                                bold: true,
                                font: DOCX_STYLES.fonts.headings,
                                size: DOCX_STYLES.sizes.chapterTitle * 2,
                                color: "1A202C",
                            }),
                        ],
                        spacing: {
                            before: DOCX_STYLES.spacing.chapterBefore,
                            after: DOCX_STYLES.spacing.chapterAfter,
                        },
                    })
                );

                const contentParagraphs = processMarkdownToDocx(chapter.content || "");
                sections.push(...contentParagraphs);
            } catch (chapterError) {
                console.log("error processing chapter", chapterError);
            }
        });

        const doc = new Document({
            sections: [
                {
                    properties: {
                        page: {
                            margin: {
                                top: 1440,
                                right: 1440,
                                bottom: 1440,
                                left: 1440,
                            },
                        },
                    },
                    children: sections,
                },
            ],
        });

        const buffer = await Packer.toBuffer(doc);
        const safeFileName = (book.title || "ebook")
            .replace(/[^a-z0-9]/gi, "_")
            .toLowerCase();

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeFileName}.docx"`
        );
        res.setHeader("Content-Length", buffer.length);

        return res.status(200).send(buffer);
    } catch (error) {
        console.log("error exporting document", error);
        if (!res.headersSent) {
            return res.status(500).json({
                message: "server error during document export",
                error: error.message,
            });
        }
    }
};

// ==========================================
// PDF CONFIGURATION & HELPERS (PDFKit)
// ==========================================

// Typography configuration for modern ebook styling
const TYPOGRAPHY = {
    fonts: {
        body: "Times-Roman",
        bold: "Times-Bold",
        italic: "Times-Italic",
        boldItalic: "Times-BoldItalic",
        heading: "Helvetica-Bold",
        code: "Courier",
    },
    sizes: {
        title: 28,
        subtitle: 15,
        author: 14,
        chapterTitle: 20,
        h1: 16,
        h2: 14,
        h3: 12,
        body: 11,
        code: 9.5,
    },
    colors: {
        text: "#1A202C",
        muted: "#4A5568",
        quoteText: "#555555",
        accent: "#4F46E5",
        codeBg: "#F5F5F5",
        rule: "#CCCCCC",
    },
    spacing: {
        paragraphGap: 10,
        chapterGap: 20,
        headingBefore: 14,
        headingAfter: 6,
    },
};

const resolvePdfFont = (bold, italic) => {
    if (bold && italic) return TYPOGRAPHY.fonts.boldItalic;
    if (bold) return TYPOGRAPHY.fonts.bold;
    if (italic) return TYPOGRAPHY.fonts.italic;
    return TYPOGRAPHY.fonts.body;
};

const renderInlineTokens = (doc, tokens = [], options = {}) => {
    const fontSize = options.fontSize || TYPOGRAPHY.sizes.body;
    const baseColor = options.color || TYPOGRAPHY.colors.text;
    let bold = options.bold || false;
    let italic = options.italic || false;

    tokens.forEach((token, idx) => {
        const isLast = idx === tokens.length - 1;
        const writeOpts = {
            continued: !isLast && !options.disableContinued,
        };

        if (token.type === "strong_open") {
            bold = true;
        } else if (token.type === "strong_close") {
            bold = options.bold || false;
        } else if (token.type === "em_open") {
            italic = true;
        } else if (token.type === "em_close") {
            italic = options.italic || false;
        } else if (token.type === "code_inline") {
            doc
                .font(TYPOGRAPHY.fonts.code)
                .fontSize(TYPOGRAPHY.sizes.code)
                .fillColor(baseColor)
                .text(token.content, writeOpts);
        } else if (token.type === "text") {
            doc
                .font(resolvePdfFont(bold, italic))
                .fontSize(fontSize)
                .fillColor(baseColor)
                .text(token.content, writeOpts);
        } else if (token.type === "softbreak") {
            doc
                .font(resolvePdfFont(bold, italic))
                .fontSize(fontSize)
                .fillColor(baseColor)
                .text(" ", writeOpts);
        } else if (token.type === "hardbreak") {
            doc.text("\n", writeOpts);
        }
    });
};

const renderMarkdown = (doc, markdown) => {
    const tokens = md.parse(markdown || "", {});
    let listType = null;
    let orderedCounter = 1;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        try {
            if (token.type === "heading_open") {
                const level = parseInt(token.tag.substring(1), 10);
                const nextToken = tokens[i + 1];

                if (nextToken && nextToken.type === "inline") {
                    const sizeMap = {
                        1: TYPOGRAPHY.sizes.h1,
                        2: TYPOGRAPHY.sizes.h2,
                        3: TYPOGRAPHY.sizes.h3,
                    };
                    const headingSize = sizeMap[level] || TYPOGRAPHY.sizes.h3;

                    doc.moveDown(TYPOGRAPHY.spacing.headingBefore / TYPOGRAPHY.sizes.body);
                    doc
                        .font(TYPOGRAPHY.fonts.heading)
                        .fontSize(headingSize)
                        .fillColor(TYPOGRAPHY.colors.text)
                        .text(nextToken.content, {
                            align: "left",
                        });
                    doc.moveDown(TYPOGRAPHY.spacing.headingAfter / TYPOGRAPHY.sizes.body);

                    i += 2;
                }
            } else if (token.type === "paragraph_open") {
                const nextToken = tokens[i + 1];

                if (nextToken && nextToken.type === "inline" && nextToken.children) {
                    renderInlineTokens(doc, nextToken.children, {
                        fontSize: TYPOGRAPHY.sizes.body,
                        color: TYPOGRAPHY.colors.text,
                    });
                    doc.moveDown(TYPOGRAPHY.spacing.paragraphGap / TYPOGRAPHY.sizes.body);
                    i += 2;
                }
            } else if (token.type === "bullet_list_open") {
                listType = "bullet";
            } else if (token.type === "bullet_list_close") {
                listType = null;
                doc.moveDown(0.5);
            } else if (token.type === "ordered_list_open") {
                listType = "ordered";
                orderedCounter = 1;
            } else if (token.type === "ordered_list_close") {
                listType = null;
                orderedCounter = 1;
                doc.moveDown(0.5);
            } else if (token.type === "list_item_open") {
                const nextToken = tokens[i + 1];

                if (nextToken && nextToken.type === "paragraph_open") {
                    const inlineToken = tokens[i + 2];

                    if (
                        inlineToken &&
                        inlineToken.type === "inline" &&
                        inlineToken.children
                    ) {
                        const prefix =
                            listType === "ordered" ? `${orderedCounter++}. ` : "• ";
                        const baseX = doc.page.margins.left;

                        doc
                            .font(TYPOGRAPHY.fonts.body)
                            .fontSize(TYPOGRAPHY.sizes.body)
                            .fillColor(TYPOGRAPHY.colors.text)
                            .text(prefix, baseX + 18, doc.y, { continued: true });

                        renderInlineTokens(doc, inlineToken.children, {
                            fontSize: TYPOGRAPHY.sizes.body,
                            color: TYPOGRAPHY.colors.text,
                        });

                        doc.x = baseX;
                        doc.moveDown(0.35);
                        i += 4;
                    }
                }
            } else if (token.type === "blockquote_open") {
                const nextToken = tokens[i + 1];
                if (nextToken && nextToken.type === "paragraph_open") {
                    const inlineToken = tokens[i + 2];
                    if (inlineToken && inlineToken.type === "inline") {
                        const startY = doc.y;
                        const leftX = doc.page.margins.left + 16;

                        doc
                            .font(TYPOGRAPHY.fonts.italic)
                            .fontSize(TYPOGRAPHY.sizes.body)
                            .fillColor(TYPOGRAPHY.colors.quoteText)
                            .text(inlineToken.content, leftX, startY, {
                                width:
                                    doc.page.width -
                                    doc.page.margins.right -
                                    leftX,
                            });

                        const endY = doc.y;
                        doc
                            .save()
                            .moveTo(doc.page.margins.left + 6, startY)
                            .lineTo(doc.page.margins.left + 6, endY)
                            .lineWidth(2.5)
                            .strokeColor(TYPOGRAPHY.colors.accent)
                            .stroke()
                            .restore();

                        doc.x = doc.page.margins.left;
                        doc.moveDown(0.8);
                        i += 4;
                    }
                }
            } else if (token.type === "code_block" || token.type === "fence") {
                const startY = doc.y;
                const width =
                    doc.page.width - doc.page.margins.left - doc.page.margins.right;

                doc
                    .font(TYPOGRAPHY.fonts.code)
                    .fontSize(TYPOGRAPHY.sizes.code)
                    .fillColor(TYPOGRAPHY.colors.text);

                const textHeight = doc.heightOfString(token.content, { width: width - 16 });

                doc
                    .save()
                    .rect(doc.page.margins.left, startY - 4, width, textHeight + 12)
                    .fill(TYPOGRAPHY.colors.codeBg)
                    .restore();

                doc
                    .font(TYPOGRAPHY.fonts.code)
                    .fontSize(TYPOGRAPHY.sizes.code)
                    .fillColor(TYPOGRAPHY.colors.text)
                    .text(token.content, doc.page.margins.left + 8, startY + 2, {
                        width: width - 16,
                    });

                doc.x = doc.page.margins.left;
                doc.moveDown(0.9);
            } else if (token.type === "hr") {
                const y = doc.y + 6;
                doc
                    .save()
                    .moveTo(doc.page.margins.left, y)
                    .lineTo(doc.page.width - doc.page.margins.right, y)
                    .lineWidth(1)
                    .strokeColor(TYPOGRAPHY.colors.rule)
                    .stroke()
                    .restore();
                doc.moveDown(1);
            }
        } catch (tokenError) {
            console.error("Error rendering PDF token:", token.type, tokenError);
        }
    }
};

const exportAsPDF = async (req, res) => {
    try {
        const book = await bookModel.findById(req.params.id);

        if (!book) {
            return res.status(404).json({ message: "book not found" });
        }

        if (book.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized" });
        }

        const doc = new PDFDocument({
            size: "A4",
            margins: {
                top: 72,
                right: 72,
                bottom: 72,
                left: 72,
            },
        });

        const safeFileName = (book.title || "ebook")
            .replace(/[^a-z0-9]/gi, "_")
            .toLowerCase();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeFileName}.pdf"`
        );

        doc.pipe(res);

        // Cover image if available
        if (book.coverImage && !book.coverImage.includes("pravatar")) {
            const imagePath = book.coverImage.replace(/^\/+/, "");
            try {
                if (fs.existsSync(imagePath)) {
                    const centerX = (doc.page.width - 300) / 2;
                    doc.image(imagePath, centerX, 120, {
                        fit: [300, 420],
                        align: "center",
                    });
                    doc.addPage();
                }
            } catch (imgError) {
                console.log("error embedding PDF image", imagePath, imgError);
            }
        }

        // Title page
        doc.moveDown(6);
        doc
            .font(TYPOGRAPHY.fonts.heading)
            .fontSize(TYPOGRAPHY.sizes.title)
            .fillColor(TYPOGRAPHY.colors.text)
            .text(book.title || "Untitled", { align: "center" });

        if (book.subtitle && book.subtitle.trim()) {
            doc.moveDown(1);
            doc
                .font(TYPOGRAPHY.fonts.italic)
                .fontSize(TYPOGRAPHY.sizes.subtitle)
                .fillColor(TYPOGRAPHY.colors.muted)
                .text(book.subtitle, { align: "center" });
        }

        if (book.author) {
            doc.moveDown(1.5);
            doc
                .font(TYPOGRAPHY.fonts.body)
                .fontSize(TYPOGRAPHY.sizes.author)
                .fillColor(TYPOGRAPHY.colors.muted)
                .text(`by ${book.author}`, { align: "center" });
        }

        // Chapters
        (book.chapters || []).forEach((chapter) => {
            try {
                doc.addPage();
                doc
                    .font(TYPOGRAPHY.fonts.heading)
                    .fontSize(TYPOGRAPHY.sizes.chapterTitle)
                    .fillColor(TYPOGRAPHY.colors.text)
                    .text(chapter.title || "", { align: "left" });

                doc.moveDown(TYPOGRAPHY.spacing.chapterGap / TYPOGRAPHY.sizes.body);
                renderMarkdown(doc, chapter.content || "");
            } catch (chapterError) {
                console.log("error rendering PDF chapter", chapterError);
            }
        });

        doc.end();
    } catch (error) {
        console.log("error exporting PDF", error);
        if (!res.headersSent) {
            return res.status(500).json({
                message: "server error during PDF export",
                error: error.message,
            });
        }
    }
};

module.exports = {
    exportAsPDF,
    exportAsDocument,
};