import getDataWrapper from "../feature/dataWrapper.js";

const columns = ["Chr","Start","End", "Name", "Null", "Strand", "ExcludedBases", "Coverage","IntronDepth","IntronDepth25Percentile","IntronDepth50Percentile","IntronDepth75Percentile","ExonToIntronReadsLeft","ExonToIntronReadsRight","IntronDepthFirst50bp","IntronDepthLast50bp","SpliceLeft","SpliceRight","SpliceExact","IRratio","Warnings"];

/**
 * Parser for IGV desktop GWAS files.  See http://software.broadinstitute.org/software/igv/GWAS
 */
class IRFinderParser {

	constructor(config) {
		this.config = config;
	}


	parseFeatures(data) {
		if (!data) return null;
		const dataWrapper = getDataWrapper(data);
		const allFeatures = [];
		let line;
		while ((line = dataWrapper.nextLine()) !== undefined) {
			const tokens = line.split(/\t/);
			if (tokens.length === columns.length && tokens[0] != columns[0]) {
				allFeatures.push(new IRFinderFeature(tokens))
			}
		}
		return allFeatures;
	}
	
	parseHeader(){
		return columns
	}
}

class IRFinderFeature {

	constructor(tokens) {
		this.chr = tokens[0];
		this.start = parseInt(tokens[1])-15;
		this.end = parseInt(tokens[2])+15;
		this.intronType = tokens[3].split("/")[2]
		this.strand = tokens[5];
		this.intronDepth = parseFloat(tokens[8]);
		this.exonToIntron = [parseFloat(tokens[12]),parseFloat(tokens[13])];
		this.flankDepth = [parseFloat(tokens[14]),parseFloat(tokens[15]) ]
		this.splice = [parseInt(tokens[16]),parseInt(tokens[17]), parseInt(tokens[18])];
		this.exons = [Math.ceil(this.flankDepth[0]+ this.splice[0]), Math.ceil(this.flankDepth[1]+ this.splice[1])];
		this.value = Math.max(...this.exons) ; // It's the maximum height
		this.IRratio = parseFloat([tokens[19]]);
		this.warning= tokens[20];
		this.tokens=tokens;
	}

	popupData() {
		return columns.map((c, index)=> {
			return { name: c, value: this.tokens[index] }
		}).filter((f)=>{return f.name != "Null"});
	}

	getAttribute(attrName) {
		return this.tokens.find((n, idx)=>{ return columns[idx] == attrName;});
	}

}

export default IRFinderParser

