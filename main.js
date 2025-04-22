// Import required modules
const {Command} = require ('commander');
const AWS = require('aws-sdk');
const logger = require('./logger');
const dayjs = require('dayjs');

// Initialize CLI program with commander
const program = new Command();

// Define CLI options
program
    .requiredOption('--region <region>', 'AWS region')
    .requiredOption('--retention-days <days>', 'Days to retain images', parseInt)
    .requiredOption('--tag-prefixes <prefixes>', 'Comma-seperated list of tag prefixes')
    .option('--dry-run', 'Simulate changes without deleting anything');


// Parse CLI arguments
program.parse(process.argv);
const options = program.opts();

// Parse tag prefixes into an array
const tagPrefixes = options.tagPrefixes.split(',').map(p => p.trim());

// Set AWS region for SDK
AWS.config.update({ region: options.region });
const ecr = new AWS.ECR();


// Fetch list of all ECR repositories
async function listRepositories(){
    const response = await ecr.describeRepositories().promise();
    return response.repositories.map( repo => repo.repositoryName);
}


// Fetch list of images (with metadata) in a given repository
async function listImages(repoName) {
    const response = await ecr.describeImages({
        repositoryName: repoName,
    }).promise();

    return response.imageDetails || [];
}


// Logic to filter out images that are old and can be deleted
function filterOldImages(images, retentionDays, tagPrefixes) {
    const thresholdDate = dayjs().subtract(retentionDays, 'day');
    const keepByTagPrefix = {};

    tagPrefixes.forEach(prefix => {
        const matching = images
            .filter(img => (img.imageTags || []).some(tag => tag.startsWith(prefix)))
            .sort((a,b) => new Date(b.imagePushedAt)- new Date(a.imagePushedAt))
            .slice(0,2);  // Keep top 2 recent images per prefix

        keepByTagPrefix[prefix] = new Set(
            matching.map(img => img.imageDigest)
        );
    });
        // Collect image digests to retain
        const toRetain = new Set();
        Object.values(keepByTagPrefix).forEach(set => {
            set.forEach(digest => toRetain.add(digest));
        });

        const toDelete = [];
        const retained = [];



        // Classify images into retained and deletable
        for (const image of images) {
            const pushedDate = dayjs(image.imagePushedAt);
            const isOld = pushedDate.isBefore(thresholdDate);

            const isTagged = image.imageTags && image.imageTags.length > 0;
            const isProtected = image.imageDigest && toRetain.has(image.imageDigest);

            if (!isTagged) {
                // Delete untagged images
                toDelete.push(image);
            } else if (isOld && !isProtected) {
                // Delete old images not in the protect list
                toDelete.push(image);
            } else if (isProtected || !isOld) {
                // Retain protected or recent images
                retained.push(image);
            }

        }
        return{toDelete, retained};
    }


// Function to delete images from ECR (or simulate deletion)
async function deleteImages(repoName, imagesToDelete){
    if(imagesToDelete.length === 0){
        logger.info(`No old images to delete in ${repoName}`);
        return;
    }

    const batch = imagesToDelete.map(img => ({
        imageDigest: img.imageDigest,
    }));

    if (options.dryRun) {
        logger.info(`[DRY-RUN] Would delete from ${repoName}:`, batch);
    } else {
        await ecr.batchDeleteImage({
            repositoryName: repoName,
            imageIds: batch
        }).promise();
    
        logger.info(`Deleted ${batch.length} images from ${repoName}`);
    }
}

// Main function
(async () => {
    try{
        logger.info (`Starting cleaup in region: ${options.region}`);

        // List all repositories
        const repos = await listRepositories();
        logger.info(`Found ECR Repositories: ${repos.join(', ')}`);

        // Process each repository
        for (const repo of repos) {
            logger.info(`Checking repository: ${repo}`);

            // Get images from the repo
            const images = await listImages(repo);

            // Filter images for deletion or retention
            const {toDelete, retained} = filterOldImages(images, options.retentionDays, tagPrefixes);

            // Log details
            logger.info(`Images to be deleted (${toDelete.length}):`);
            toDelete.forEach (img=> {
                logger.info(` Digest: ${img.imageDigest}, Tags: ${img.imageTags || 'Untagged'}, PushedAt: ${img.imagePushedAt}`);
            });

            logger.info(`Images to be Retained (${retained.length}):`);
            retained.forEach(img => {
                logger.info(` Digest: ${img.imageDigest}, Tags: ${img.imageTags}, PushedAt: ${img.imagePushedAt}`);
            });

            await deleteImages(repo, toDelete);
        }

        logger.info('Cleanup process completed.');
    } catch(err){
        logger.error('Error occured: ', err);
    }
})();


