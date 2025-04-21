const {Command} = require ('commander');
const AWS = require('aws-sdk');
const logger = require('./logger');
const dayjs = require('dayjs');

const program = new Command();

program
    .requiredOption('--region <region>', 'AWS region')
    .requiredOption('--retention-days <days>', 'Days to retain images', parseInt)
    .requiredOption('--tag-prefixes <prefixes>', 'Comma-seperated list of tag prefixes')
    .option('--dry-run', 'Simulate changes without deleting anything');

program.parse(process.argv);
const options = program.opts();

const tagPrefixes = options.tagPrefixes.split(',').map(p => p.trim());

AWS.config.update({ region: options.region });
const ecr = new AWS.ECR();

async function listRepositories(){
    const response = await ecr.describeRepositories().promise();
    return response.repositories.map( repo => repo.repositoryName);
}

async function listImages(repoName) {
    const response = await ecr.describeImages({
        repositoryName: repoName,
    }).promise();

    return response.imageDetails || [];
}

function filterOldImages(images, retentionDays, tagPrefixes) {
    const thresholdDate = dayjs().subtract(retentionDays, 'day');
    const keepByTagPrefix = {};

    tagPrefixes.forEach(prefix => {
        const matching = images
            .filter(img => (img.imageTags || []).some(tag => tag.startsWith(prefix)))
            .sort((a,b) => new Date(b.imagePushedAt)- new Date(a.imagePushedAt))
            .slice(0,2);

        keepByTagPrefix[prefix] = new Set(
            matching.map(img => img.imageDigest)
        );
    });

        const toRetain = new Set();
        Object.values(keepByTagPrefix).forEach(set => {
            set.forEach(digest => toRetain.add(digest));
        });

        const toDelete = [];
        const retained = [];

        for (const image of images) {
            const pushedDate = dayjs(image.imagePushedAt);
            const isOld = pushedDate.isBefore(thresholdDate);

            const isTagged = image.imageTags && image.imageTags.length > 0;
            const isProtected = image.imageDigest && toRetain.has(image.imageDigest);

            if (!isTagged) {
                toDelete.push(image);
            } else if (isOld && !isProtected) {
                toDelete.push(image);
            } else if (isProtected) {
                retained.push(image);
            }

        }
        return{toDelete, retained};
    }

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


(async () => {
    try{
        logger.info (`Starting cleaup in region: ${options.region}`);
        const repos = await listRepositories();
        logger.info(`Found ECR Repositories: ${repos.join(', ')}`);

        for (const repo of repos) {
            logger.info(`Checking repository: ${repo}`);
            const images = await listImages(repo);
            const {toDelete, retained} = filterOldImages(images, options.retentionDays, tagPrefixes);

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


