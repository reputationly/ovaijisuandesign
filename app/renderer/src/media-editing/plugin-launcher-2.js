// plugin-launcher-2.js

var RelationshipTypes;

(function (RelationshipTypes) {
  RelationshipTypes["OfficeDocument"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
  RelationshipTypes["FontTable"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable";
  RelationshipTypes["Image"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
  RelationshipTypes["Numbering"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering";
  RelationshipTypes["Styles"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
  RelationshipTypes["StylesWithEffects"] =
    "http://schemas.microsoft.com/office/2007/relationships/stylesWithEffects";
  RelationshipTypes["Theme"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme";
  RelationshipTypes["Settings"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings";
  RelationshipTypes["WebSettings"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings";
  RelationshipTypes["Hyperlink"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
  RelationshipTypes["Footnotes"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes";
  RelationshipTypes["Endnotes"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes";
  RelationshipTypes["Footer"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer";
  RelationshipTypes["Header"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header";
  RelationshipTypes["ExtendedProperties"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties";
  RelationshipTypes["CoreProperties"] =
    "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";
  RelationshipTypes["CustomProperties"] =
    "http://schemas.openxmlformats.org/package/2006/relationships/metadata/custom-properties";
  RelationshipTypes["Comments"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments";
  RelationshipTypes["CommentsExtended"] =
    "http://schemas.microsoft.com/office/2011/relationships/commentsExtended";
  RelationshipTypes["AltChunk"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk";
})(RelationshipTypes || (RelationshipTypes = {}));

var SectionType;

(function (SectionType) {
  SectionType["Continuous"] = "continuous";
  SectionType["NextPage"] = "nextPage";
  SectionType["NextColumn"] = "nextColumn";
  SectionType["EvenPage"] = "evenPage";
  SectionType["OddPage"] = "oddPage";
})(SectionType || (SectionType = {}));

var DomType;

(function (DomType) {
  DomType["Document"] = "document";
  DomType["Paragraph"] = "paragraph";
  DomType["Run"] = "run";
  DomType["Break"] = "break";
  DomType["NoBreakHyphen"] = "noBreakHyphen";
  DomType["Table"] = "table";
  DomType["Row"] = "row";
  DomType["Cell"] = "cell";
  DomType["Hyperlink"] = "hyperlink";
  DomType["SmartTag"] = "smartTag";
  DomType["Drawing"] = "drawing";
  DomType["Image"] = "image";
  DomType["Text"] = "text";
  DomType["Tab"] = "tab";
  DomType["Symbol"] = "symbol";
  DomType["BookmarkStart"] = "bookmarkStart";
  DomType["BookmarkEnd"] = "bookmarkEnd";
  DomType["Footer"] = "footer";
  DomType["Header"] = "header";
  DomType["FootnoteReference"] = "footnoteReference";
  DomType["EndnoteReference"] = "endnoteReference";
  DomType["Footnote"] = "footnote";
  DomType["Endnote"] = "endnote";
  DomType["SimpleField"] = "simpleField";
  DomType["ComplexField"] = "complexField";
  DomType["Instruction"] = "instruction";
  DomType["VmlPicture"] = "vmlPicture";
  DomType["MmlMath"] = "mmlMath";
  DomType["MmlMathParagraph"] = "mmlMathParagraph";
  DomType["MmlFraction"] = "mmlFraction";
  DomType["MmlFunction"] = "mmlFunction";
  DomType["MmlFunctionName"] = "mmlFunctionName";
  DomType["MmlNumerator"] = "mmlNumerator";
  DomType["MmlDenominator"] = "mmlDenominator";
  DomType["MmlRadical"] = "mmlRadical";
  DomType["MmlBase"] = "mmlBase";
  DomType["MmlDegree"] = "mmlDegree";
  DomType["MmlSuperscript"] = "mmlSuperscript";
  DomType["MmlSubscript"] = "mmlSubscript";
  DomType["MmlPreSubSuper"] = "mmlPreSubSuper";
  DomType["MmlSubArgument"] = "mmlSubArgument";
  DomType["MmlSuperArgument"] = "mmlSuperArgument";
  DomType["MmlNary"] = "mmlNary";
  DomType["MmlDelimiter"] = "mmlDelimiter";
  DomType["MmlRun"] = "mmlRun";
  DomType["MmlEquationArray"] = "mmlEquationArray";
  DomType["MmlLimit"] = "mmlLimit";
  DomType["MmlLimitLower"] = "mmlLimitLower";
  DomType["MmlMatrix"] = "mmlMatrix";
  DomType["MmlMatrixRow"] = "mmlMatrixRow";
  DomType["MmlBox"] = "mmlBox";
  DomType["MmlBar"] = "mmlBar";
  DomType["MmlGroupChar"] = "mmlGroupChar";
  DomType["VmlElement"] = "vmlElement";
  DomType["Inserted"] = "inserted";
  DomType["Deleted"] = "deleted";
  DomType["DeletedText"] = "deletedText";
  DomType["Comment"] = "comment";
  DomType["CommentReference"] = "commentReference";
  DomType["CommentRangeStart"] = "commentRangeStart";
  DomType["CommentRangeEnd"] = "commentRangeEnd";
  DomType["AltChunk"] = "altChunk";
})(DomType || (DomType = {}));
