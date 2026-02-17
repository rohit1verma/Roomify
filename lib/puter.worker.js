const PROJECT_PREFIX = 'roomify_project_';

const jsonError = (status, message, extra = {}) => {
    return new Response(JSON.stringify({  error: message, ...extra }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    })
}

const getUserId = async (userPuter) => {
    try {
        const user = await userPuter.auth.getUser();

        return user?.uuid || null;
    } catch {
        return null;
    }
}

router.post('/api/projects/save', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if(!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const project = body?.project;
        if(!project?.id || !project?.sourceImage) return jsonError(400, 'Project ID and source image are required');

        // Get user info
        const userInfo = await userPuter.auth.getUser();
        const userId = userInfo?.uuid || null;
        const userName = userInfo?.username || null;
        if(!userId) return jsonError(401, 'Authentication failed');

        // Always set ownerId and ownerName
        const payload = {
            ...project,
            ownerId: userId,
            ownerName: project.ownerName || userName,
            updatedAt: new Date().toISOString(),
        }

        const key = `${PROJECT_PREFIX}${userId}_${project.id}`;
        await userPuter.kv.set(key, payload);

        return { saved: true, id: project.id, project: payload }
    } catch (e) {
        return jsonError(500, 'Failed to save project', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/projects/list', async ({ user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        // List all projects and filter by ownerId to ensure users only see their own work
        const projects = (await userPuter.kv.list(PROJECT_PREFIX, true))
            .filter(({value}) => value && value.ownerId === userId)
            .map(({value}) => ({ ...value, isPublic: true }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return { projects };
    } catch (e) {
        return jsonError(500, 'Failed to list projects', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/projects/get', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return jsonError(400, 'Project ID is required');

        // Try new key format first, then fallback to old format
        let key = `${PROJECT_PREFIX}${userId}_${id}`;
        let project = await userPuter.kv.get(key);
        
        if (!project) {
            key = `${PROJECT_PREFIX}${id}`;
            project = await userPuter.kv.get(key);
        }

        if (!project || project.ownerId !== userId) return jsonError(404, 'Project not found');

        return { project };
    } catch (e) {
        return jsonError(500, 'Failed to get project', { message: e.message || 'Unknown error' });
    }
})

router.post('/api/projects/delete', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const id = body?.id;

        if (!id) return jsonError(400, 'Project ID is required');

        // Attempt to delete both potential key formats (new and legacy)
        const keyNew = `${PROJECT_PREFIX}${userId}_${id}`;
        const keyOld = `${PROJECT_PREFIX}${id}`;
        
        await Promise.all([
            userPuter.kv.del(keyNew),
            userPuter.kv.del(keyOld)
        ]);

        return { deleted: true, id };
    } catch (e) {
        return jsonError(500, 'Failed to delete project', { message: e.message || 'Unknown error' });
    }
})
